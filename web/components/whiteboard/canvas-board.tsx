"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { HocuspocusProvider } from "@hocuspocus/provider"
import * as Y from "yjs"
import { useTheme } from "next-themes"
import { createClient } from "@/utils/supabase/client"
import {
    ArrowLeft,
    Hand,
    MousePointer2,
    Square,
    Circle,
    Diamond,
    ArrowRight,
    Minus,
    Pencil,
    Type,
    Eraser,
    Cloud,
    Loader2,
    AlignLeft,

    AlignCenter,
    AlignRight,

    Move,
    Share,
    Globe,
    Copy,
    Check,
    X,
    Palette,
    MenuIcon,
    Menu,
    Image as ImageIcon,
    Undo,
    Redo,
    ZoomIn,
    ZoomOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type Tool = 'hand' | 'selection' | 'rectangle' | 'circle' | 'diamond' | 'arrow' | 'line' | 'pencil' | 'text' | 'eraser' | 'image'

interface CanvasElement {
    id: string
    type: Tool
    x: number
    y: number
    width: number
    height: number
    strokeColor: string
    strokeWidth?: number
    points?: { x: number; y: number }[]
    text?: string
    fontFamily?: string
    textAlign?: string
    data?: string // For image base64
}

const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // Limit width for storage
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                // Compress to JPEG with 0.6 quality
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

const COLORS = [
    { name: 'Black', value: 'black' },
    { name: 'White', value: 'white' }, // Add White for dark mode
    { name: 'Red', value: '#ef4444' }, // red-500
    { name: 'Blue', value: '#3b82f6' }, // blue-500
    { name: 'Green', value: '#22c55e' }, // green-500
    { name: 'Yellow', value: '#eab308' }, // yellow-500
    { name: 'Purple', value: '#a855f7' }, // purple-500
]

const WIDTHS = [2, 4, 6, 12]

const FONTS = [
    { name: 'Sans', value: 'sans-serif' },
    { name: 'Serif', value: 'serif' },
    { name: 'Mono', value: 'monospace' },
    { name: 'Script', value: 'cursive' },
]

const ALIGNS = [
    { value: 'left', icon: <AlignLeft className="w-4 h-4" /> },
    { value: 'center', icon: <AlignCenter className="w-4 h-4" /> },
    { value: 'right', icon: <AlignRight className="w-4 h-4" /> },
]

export default function CanvasBoard({ roomId, initialData, initialIsPublic = false }: { roomId: string, initialData?: any[], initialIsPublic?: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)
    const [activeTool, setActiveTool] = useState<Tool>('hand')

    // Tool Options State
    const [toolOptions, setToolOptions] = useState({
        strokeColor: 'black',
        strokeWidth: 2,
        fontFamily: 'sans-serif',
        textAlign: 'left'
    })

    // State for Vector Elements
    const [elements, setElements] = useState<CanvasElement[]>([])
    const [currentElement, setCurrentElement] = useState<CanvasElement | null>(null)

    // Yjs Reference
    const yElementsRef = useRef<Y.Array<CanvasElement> | null>(null)
    const undoManagerRef = useRef<Y.UndoManager | null>(null)

    // Zoom State
    const [zoom, setZoom] = useState(1)

    // Theme logic
    const { theme } = useTheme() // 'light' | 'dark' | 'system'
    // To ensure hydration match, we might need a mounted state or just rely on client-side render
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])

    const isDark = mounted && (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))


    // Interaction State
    const [isDrawing, setIsDrawing] = useState(false)
    const [isPanning, setIsPanning] = useState(false)
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
    const [startPanMousePosition, setStartPanMousePosition] = useState({ x: 0, y: 0 })
    const [writingText, setWritingText] = useState<{ x: number, y: number, text: string } | null>(null)
    const textAreaRef = useRef<HTMLTextAreaElement>(null)
    const [draggingElement, setDraggingElement] = useState<{ id: string, startX: number, startY: number, initialElementX: number, initialElementY: number } | null>(null)
    const [isDraggingTextRef, setIsDraggingTextRef] = useState(false)
    const dragOffsetRef = useRef({ x: 0, y: 0 }) // Track visual delta without re-rendering
    const textDragStartRef = useRef<{ startX: number, startY: number, initialX: number, initialY: number } | null>(null)
    const pinchRef = useRef<{ distance: number } | null>(null)
    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map())
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Supabase Client
    const supabase = createClient()

    // Save Status State
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')

    // Share State
    const [isPublic, setIsPublic] = useState(initialIsPublic)
    const [isCopied, setIsCopied] = useState(false)

    // Mobile Menu State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const handleShareToggle = async () => {
        const newStatus = !isPublic
        setIsPublic(newStatus)
        const { updateWhiteboardSharing } = await import("@/app/actions")
        await updateWhiteboardSharing(roomId, newStatus)
    }

    const copyLink = () => {
        const url = `${window.location.origin}/whiteboard/${roomId}`
        navigator.clipboard.writeText(url)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    const handleExportImage = () => {
        if (!canvasRef.current) return

        // Ensure everything is rendered cleanly
        renderCanvas()

        // Create a temporary link
        const link = document.createElement('a')
        link.download = `whiteboard-${roomId}.png`
        link.href = canvasRef.current.toDataURL('image/png')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Debounced Save to Supabase
    useEffect(() => {
        if (elements.length === 0) return

        const saveToDb = async () => {
            setSaveStatus('saving')
            console.log("Saving to Supabase (Client-side)...")
            try {
                const { error } = await supabase
                    .from('whiteboards')
                    .update({ content: elements })
                    .eq('id', roomId)

                if (error) {
                    console.error("Supabase Save Error:", error)
                } else {
                    console.log("Saved to Supabase successfully")
                }
            } catch (err) {
                console.error("Save failed:", err)
            } finally {
                setSaveStatus('saved')
            }
        }

        const timeoutId = setTimeout(saveToDb, 2000) // Debounce 2s

        return () => clearTimeout(timeoutId)
    }, [elements, roomId, supabase])

    // Setup Collaboration
    useEffect(() => {
        const ydoc = new Y.Doc()

        // Initialize with server-fetched data if available and doc is empty
        const yArray = ydoc.getArray<CanvasElement>("elements")
        if (initialData && initialData.length > 0 && yArray.length === 0) {
            console.log("Hydrating from initialData:", initialData.length, "elements")
            yArray.insert(0, initialData as CanvasElement[])
            setElements(yArray.toArray())
        }

        yElementsRef.current = yArray

        // Use environment variable or default
        let hostUrl = (process.env.NEXT_PUBLIC_COLLAB_SERVER_URL || 'ws://127.0.0.1:1234')

        if (hostUrl.startsWith('http')) hostUrl = hostUrl.replace(/^http/, 'ws')
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && !hostUrl.startsWith('wss:')) {
            hostUrl = hostUrl.replace('ws://', 'wss://')
        }

        console.log('Connecting to Hocuspocus at:', hostUrl)

        const provider = new HocuspocusProvider({
            url: hostUrl,
            name: roomId,
            document: ydoc,
        })

        provider.on('status', (event: any) => {
            console.log('Hocuspocus Connection Status:', event.status)
        })
        provider.on('synced', () => {
            console.log('Hocuspocus Synced! Document State:', ydoc.getArray("elements").toArray())
        })
        provider.on('disconnect', () => {
            console.log('Hocuspocus Disconnected')
        })

        // Sync Listener
        const handleSync = () => {
            setElements(yArray.toArray())
        }

        // Initial Load (if not hydrated above, checking again)
        if (yArray.length > 0) {
            setElements(yArray.toArray())
        }

        if (yArray.length > 0) {
            setElements(yArray.toArray())
        }

        // Initialize UndoManager
        const undoManager = new Y.UndoManager(yArray)
        undoManagerRef.current = undoManager

        yArray.observe(handleSync)

        return () => {
            provider.destroy()
            ydoc.destroy()
        }
    }, [roomId])

    // Preload Images
    useEffect(() => {
        elements.forEach(el => {
            if (el.type === 'image' && el.data && !imageCache.current.has(el.id)) {
                const img = new Image()
                img.src = el.data
                img.onload = () => {
                    imageCache.current.set(el.id, img)
                    // Set size if 0 (first load) - optional but good practice if not set perfectly initially
                    renderCanvas()
                }
            }
        })
    }, [elements])

    // Focus text input when it appears
    useEffect(() => {
        if (writingText && textAreaRef.current) {
            // Delay focus slightly to ensure render is complete and prevent immediate blur from mouse events
            setTimeout(() => {
                textAreaRef.current?.focus()
            }, 0)
        }
    }, [writingText])

    // Initialize Canvas Context
    useEffect(() => {
        const canvas = canvasRef.current
        if (canvas) {
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.lineCap = 'round'
                ctx.lineJoin = 'round'
                ctx.strokeStyle = toolOptions.strokeColor
                ctx.lineWidth = toolOptions.strokeWidth
                ctx.font = '20px sans-serif'
                setContext(ctx)
            }
        }
    }, [toolOptions]) // Re-run when options change

    // Render Loop
    const renderCanvas = () => {
        if (!context || !canvasRef.current) return

        // 1. Clear
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

        context.save()
        // Apply Pan and Zoom
        // transform(a, b, c, d, e, f) -> a:scaleX, d:scaleY, e:translateX, f:translateY
        context.setTransform(zoom, 0, 0, zoom, panOffset.x, panOffset.y)

        // 2. Draw Saved Elements
        elements.forEach(el => {
            // Draw image from cache if it exists, otherwise it might be loading
            if (el.type === 'image' && !imageCache.current.has(el.id) && el.data) {
                // If not in cache, we rely on the useEffect to load it. 
                // We can't draw it yet.
            }

            if (draggingElement && el.id === draggingElement.id) {
                // Apply temporary drag offset
                drawElement(context, {
                    ...el,
                    x: el.x + dragOffsetRef.current.x,
                    y: el.y + dragOffsetRef.current.y
                })
            } else {
                drawElement(context, el)
            }
        })

        // 3. Draw Current Element being created
        if (currentElement) {
            drawElement(context, currentElement)
        }

        context.restore()
    }

    // Trigger render when elements, transform, zoom or theme change
    useEffect(() => {
        renderCanvas()
    }, [elements, currentElement, context, panOffset, zoom, isDark])

    // Helper to draw a single element
    const drawElement = (ctx: CanvasRenderingContext2D, element: CanvasElement) => {
        const { type, x, y, width, height, strokeColor, points, text, strokeWidth } = element

        // Invert colors for Dark Mode
        let finalColor = strokeColor
        if (isDark) {
            if (strokeColor === 'black' || strokeColor === '#000000') finalColor = 'white'
            else if (strokeColor === 'white' || strokeColor === '#ffffff') finalColor = 'black'
        } else {
            // In light mode, if something was saved as 'white' (from dark mode creation maybe?), it should be black?
            // The prompt implies content created in light mode (black) should become white in dark mode.
            // Implies we store 'black' and render 'white'.
            // Conversely, if we create in Dark Mode, do we store 'white'?
            // If we store 'white', then in Light Mode it should be 'black'.
            // So: Black <-> White inversion.
            if (strokeColor === 'white' || strokeColor === '#ffffff') finalColor = 'black'
        }

        // Don't apply styles for image (except maybe selection border later)
        if (type !== 'image') {
            ctx.strokeStyle = finalColor
            ctx.lineWidth = strokeWidth || 2
            ctx.fillStyle = finalColor // For text
        }

        ctx.beginPath()

        switch (type) {
            case 'image':
                const img = imageCache.current.get(element.id)
                if (img) {
                    ctx.drawImage(img, x, y, width, height)
                    // Optional: Draw border if selected?
                }
                break
            case 'text':
                if (text) {
                    // Re-apply fillStyle to be sure
                    ctx.fillStyle = finalColor
                    ctx.font = `20px ${element.fontFamily || 'sans-serif'}`
                    ctx.textAlign = (element.textAlign as CanvasTextAlign) || 'left'
                    ctx.fillText(text, x, y + 20)
                }
                break
            case 'rectangle':
                ctx.strokeRect(x, y, width, height)
                break
            case 'circle':
                ctx.ellipse(x + width / 2, y + height / 2, Math.abs(width / 2), Math.abs(height / 2), 0, 0, 2 * Math.PI)
                ctx.stroke()
                break
            case 'diamond':
                ctx.moveTo(x + width / 2, y)
                ctx.lineTo(x + width, y + height / 2)
                ctx.lineTo(x + width / 2, y + height)
                ctx.lineTo(x, y + height / 2)
                ctx.closePath()
                ctx.stroke()
                break
            case 'line':
                ctx.moveTo(x, y)
                ctx.lineTo(x + width, y + height)
                ctx.stroke()
                break
            case 'arrow':
                const endX = x + width
                const endY = y + height
                ctx.moveTo(x, y)
                ctx.lineTo(endX, endY)
                ctx.stroke()

                const angle = Math.atan2(endY - y, endX - x)
                const headLen = 10 + (strokeWidth || 2) // Scale head with width slightly
                ctx.beginPath()
                ctx.moveTo(endX, endY)
                ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6))
                ctx.moveTo(endX, endY)
                ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6))
                ctx.stroke()
                break
            case 'pencil':
            case 'eraser':
                if (points && points.length > 0) {
                    ctx.beginPath()
                    ctx.moveTo(points[0].x, points[0].y)

                    // Smooth path using quadratic curves
                    if (points.length > 2) {
                        for (let i = 1; i < points.length - 2; i++) {
                            const p1 = points[i]
                            const p2 = points[i + 1]
                            const midX = (p1.x + p2.x) / 2
                            const midY = (p1.y + p2.y) / 2
                            ctx.quadraticCurveTo(p1.x, p1.y, midX, midY)
                        }
                        // Connect the last few points
                        const last = points[points.length - 1]
                        const secondLast = points[points.length - 2]
                        ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y)
                    } else {
                        points.forEach(p => ctx.lineTo(p.x, p.y))
                    }

                    if (type === 'eraser') {
                        ctx.save()
                        ctx.globalCompositeOperation = 'destination-out'
                        ctx.lineWidth = strokeWidth ? strokeWidth * 2.5 : 20 // Reduced multiplier for better precision
                        ctx.stroke()
                        ctx.restore()
                    } else {
                        ctx.stroke()
                    }
                }
                break
            default:
                break
        }
    }

    // Handle Resize to fill screen
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && canvasRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect()
                canvasRef.current.width = width
                canvasRef.current.height = height

                // Restore Context Defaults after resize
                const ctx = canvasRef.current.getContext('2d')
                if (ctx) {
                    ctx.lineCap = 'round'
                    ctx.lineJoin = 'round'
                    ctx.strokeStyle = toolOptions.strokeColor
                    ctx.lineWidth = toolOptions.strokeWidth
                    ctx.font = '20px sans-serif'
                    setContext(ctx)
                }
                // Re-render
                renderCanvas()
            }
        }
        window.addEventListener('resize', handleResize)
        handleResize()
        return () => window.removeEventListener('resize', handleResize)
    }, [elements, toolOptions])



    // Touch Handling Helpers
    const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>, index: number = 0) => {
        if (!canvasRef.current || !e.touches[index]) return { x: 0, y: 0 }
        const rect = canvasRef.current.getBoundingClientRect()
        return {
            x: e.touches[index].clientX - rect.left,
            y: e.touches[index].clientY - rect.top
        }
    }

    const startTouchDrawing = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (!context) return

        // 2-Finger Pan & Zoom Support
        if (e.touches.length === 2) {
            const p1 = getTouchPos(e, 0)
            const p2 = getTouchPos(e, 1)
            const cx = (p1.x + p2.x) / 2
            const cy = (p1.y + p2.y) / 2
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)

            // Cancel any current drawing if switching from 1 to 2 fingers quickly
            setIsDrawing(false)
            setCurrentElement(null)

            setIsPanning(true)
            setStartPanMousePosition({ x: cx, y: cy })
            pinchRef.current = { distance: dist }
            return
        }

        const { x: offsetX, y: offsetY } = getTouchPos(e)
        processStartDrawing(offsetX, offsetY)
    }

    const touchDraw = (e: React.TouchEvent<HTMLCanvasElement>) => {
        // Handle 2-Finger Pan & Zoom
        if (isPanning && e.touches.length === 2) {
            const p1 = getTouchPos(e, 0)
            const p2 = getTouchPos(e, 1)
            const cx = (p1.x + p2.x) / 2
            const cy = (p1.y + p2.y) / 2
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)

            // Calculate Scale
            const prevDist = pinchRef.current?.distance || dist
            const scale = prevDist > 0 ? dist / prevDist : 1
            const newZoom = Math.min(Math.max(zoom * scale, 0.5), 3)

            // Calculate Pan to keep the world point under the center stationary relative to the fingers
            // World point under previous center:
            const prevCx = startPanMousePosition.x
            const prevCy = startPanMousePosition.y
            const worldX = (prevCx - panOffset.x) / zoom
            const worldY = (prevCy - panOffset.y) / zoom

            // New pan position: cx = worldX * newZoom + newPanX
            const newPanX = cx - worldX * newZoom
            const newPanY = cy - worldY * newZoom

            setZoom(newZoom)
            setPanOffset({ x: newPanX, y: newPanY })
            setStartPanMousePosition({ x: cx, y: cy })
            pinchRef.current = { distance: dist }
            return
        }

        const { x: offsetX, y: offsetY } = getTouchPos(e)
        // Adjust for zoom in input coordinates passed to processDraw?
        // No, processDraw handles its own coordinate mapping (screen -> world).
        // BUT processDraw expects raw offset from event (screen coords).
        processDraw(offsetX, offsetY)
    }

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        // Prevent interaction if clicking on UI elements
        if ((e.target as HTMLElement).tagName !== 'CANVAS') return
        if (!context) return
        const { offsetX, offsetY } = e.nativeEvent
        processStartDrawing(offsetX, offsetY)
    }

    const processStartDrawing = (offsetX: number, offsetY: number) => {
        if (activeTool === 'hand') {
            setIsPanning(true)
            setStartPanMousePosition({ x: offsetX, y: offsetY })
            return
        }

        if (activeTool === 'text') {
            if (writingText) return

            const worldX = (offsetX - panOffset.x) / zoom
            const worldY = (offsetY - panOffset.y) / zoom
            setWritingText({ x: worldX, y: worldY, text: '' })
            return
        }

        if (activeTool === 'selection') {
            const worldX = (offsetX - panOffset.x) / zoom
            const worldY = (offsetY - panOffset.y) / zoom

            // Find clicked element (reverse order to find top-most first)
            for (let i = elements.length - 1; i >= 0; i--) {
                const el = elements[i]
                if (isHit(el, worldX, worldY, context!)) {
                    setDraggingElement({
                        id: el.id,
                        startX: worldX,
                        startY: worldY,
                        initialElementX: el.x,
                        initialElementY: el.y
                    })
                    setIsDrawing(true)
                    return
                }
            }

            // If no element hit, fallback to panning
            setIsPanning(true)
            setStartPanMousePosition({ x: offsetX, y: offsetY })
            return
        }

        if (['selection'].includes(activeTool)) return

        setIsDrawing(true)

        const x = (offsetX - panOffset.x) / zoom
        const y = (offsetY - panOffset.y) / zoom
        const id = crypto.randomUUID()

        const baseElement = {
            id,
            type: activeTool,
            x,
            y,
            strokeColor: toolOptions.strokeColor,
            strokeWidth: toolOptions.strokeWidth
        }

        if (activeTool === 'pencil' || activeTool === 'eraser') {
            setCurrentElement({
                ...baseElement,
                width: 0,
                height: 0,
                points: [{ x, y }]
            })
        } else {
            setCurrentElement({
                ...baseElement,
                width: 0,
                height: 0,
            })
        }
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const { offsetX, offsetY } = e.nativeEvent
        processDraw(offsetX, offsetY)
    }

    const processDraw = (offsetX: number, offsetY: number) => {
        if (isPanning) {
            const deltaX = offsetX - startPanMousePosition.x
            const deltaY = offsetY - startPanMousePosition.y
            setPanOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }))
            setStartPanMousePosition({ x: offsetX, y: offsetY })
            return
        }

        // Handle Moving the Text Input Box (Direct DOM manipulation for performance)
        if (isDraggingTextRef && writingText && textAreaRef.current) {
            const worldX = (offsetX - panOffset.x) / zoom
            const worldY = (offsetY - panOffset.y) / zoom

            // Initialize textDragStartRef if it's null (first move after drag start)
            if (!textDragStartRef.current) {
                textDragStartRef.current = {
                    startX: worldX,
                    startY: worldY,
                    initialX: writingText.x,
                    initialY: writingText.y
                }
            }

            const dx = worldX - textDragStartRef.current.startX
            const dy = worldY - textDragStartRef.current.startY

            setWritingText({
                ...writingText,
                x: textDragStartRef.current.initialX + dx,
                y: textDragStartRef.current.initialY + dy
            })
            return
        }

        // Handle Moving an Element (Selection Tool)
        if (draggingElement) {
            const worldX = (offsetX - panOffset.x) / zoom
            const worldY = (offsetY - panOffset.y) / zoom
            const deltaX = worldX - draggingElement.startX
            const deltaY = worldY - draggingElement.startY

            // Update Ref instead of State
            dragOffsetRef.current = { x: deltaX, y: deltaY }

            // Request Render
            requestAnimationFrame(renderCanvas)
            return
        }

        if (!isDrawing || !currentElement) return

        const worldX = (offsetX - panOffset.x) / zoom
        const worldY = (offsetY - panOffset.y) / zoom

        if (activeTool === 'pencil' || activeTool === 'eraser') {
            // Append point
            setCurrentElement({
                ...currentElement,
                points: [...(currentElement.points || []), { x: worldX, y: worldY }]
            })
        } else {
            // Update Size
            setCurrentElement({
                ...currentElement,
                width: worldX - currentElement.x,
                height: worldY - currentElement.y
            })
        }
    }

    const stopDrawing = () => {
        if (isPanning) {
            console.log("Finished Panning")
            setIsPanning(false)
            pinchRef.current = null
            return
        }

        if (isDraggingTextRef) {
            console.log("Finished Moving Text Box")
            setIsDraggingTextRef(false)
            textDragStartRef.current = null // Reset for next drag
            // The `writingText` state is already updated during `draw` for text, so no commit needed here.
            return
        }

        if (draggingElement) {
            console.log("Finished Moving Element")

            // Commit the drag
            const deltaX = dragOffsetRef.current.x
            const deltaY = dragOffsetRef.current.y

            if (deltaX !== 0 || deltaY !== 0) {
                const updatedElements = elements.map(el => {
                    if (el.id === draggingElement.id) {
                        return {
                            ...el,
                            x: draggingElement.initialElementX + deltaX,
                            y: draggingElement.initialElementY + deltaY
                        }
                    }
                    return el
                })
                setElements(updatedElements)

                // Sync to Yjs
                if (yElementsRef.current) {
                    const index = elements.findIndex(el => el.id === draggingElement.id)
                    if (index !== -1) {
                        // We need the *updated* element, calculated above
                        const updatedEl = updatedElements[index]
                        yElementsRef.current.delete(index, 1)
                        yElementsRef.current.insert(index, [updatedEl])
                    }
                }
            }

            // Reset
            setDraggingElement(null)
            dragOffsetRef.current = { x: 0, y: 0 }
            requestAnimationFrame(renderCanvas) // Final draw to clear any temporary offsets
            return
        }

        if (!isDrawing) return
        console.log("Finished Drawing. Element added:", currentElement)
        setIsDrawing(false)
        if (currentElement && yElementsRef.current) {
            // Push to Yjs
            yElementsRef.current.push([currentElement])
            setCurrentElement(null)
        }
    }

    const handleTextComplete = () => {
        if (writingText && writingText.text.trim()) {
            console.log("Committing Text:", writingText.text)
            const newElement: CanvasElement = {
                id: crypto.randomUUID(),
                type: 'text',
                x: writingText.x,
                y: writingText.y,
                width: 0,
                height: 0,
                strokeColor: toolOptions.strokeColor,
                text: writingText.text,
                strokeWidth: toolOptions.strokeWidth,
                fontFamily: toolOptions.fontFamily,
                textAlign: toolOptions.textAlign
            }
            if (yElementsRef.current) {
                yElementsRef.current.push([newElement])
            }
        } else {
            console.log("Cancelled Text (Empty)")
        }
        setWritingText(null)
    }

    const getCursorStyle = () => {
        switch (activeTool) {
            case 'hand': return 'grab'
            case 'selection': return 'default'
            case 'text': return 'text'
            default: return 'crosshair'
        }
    }

    const tools: { id: Tool, icon: React.ReactNode }[] = [
        { id: 'hand', icon: <Hand className="w-5 h-5" /> },
        { id: 'selection', icon: <MousePointer2 className="w-5 h-5" /> },
        { id: 'rectangle', icon: <Square className="w-5 h-5" /> },
        { id: 'circle', icon: <Circle className="w-5 h-5" /> },
        { id: 'diamond', icon: <Diamond className="w-5 h-5" /> },
        { id: 'arrow', icon: <ArrowRight className="w-5 h-5" /> },
        { id: 'line', icon: <Minus className="w-5 h-5" /> },
        { id: 'pencil', icon: <Pencil className="w-5 h-5" /> },
        { id: 'text', icon: <Type className="w-5 h-5" /> },
        { id: 'image', icon: <ImageIcon className="w-5 h-5" /> },
        { id: 'eraser', icon: <Eraser className="w-5 h-5" /> },
    ]

    // Action Handlers
    const handleUndo = () => {
        undoManagerRef.current?.undo()
    }

    const handleRedo = () => {
        undoManagerRef.current?.redo()
    }

    const handleZoomIn = () => {
        setZoom(z => Math.min(z + 0.1, 3))
    }

    const handleZoomOut = () => {
        setZoom(z => Math.max(z - 0.1, 0.5))
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const compressedBase64 = await compressImage(file)

            // Calculate center of view or some default position
            // Since we don't have viewport center easily without calculation, let's put it at panOffset + 100,100
            // Actually panOffset shifts the world. World coordinates for screen (100,100) are (100 - panOffset.x, 100 - panOffset.y)

            const startX = 100 - panOffset.x
            const startY = 100 - panOffset.y

            const id = crypto.randomUUID()

            // Get dimensions from the loaded image to maintain aspect ratio
            const tempImg = new Image()
            tempImg.src = compressedBase64
            tempImg.onload = () => {
                const newElement: CanvasElement = {
                    id,
                    type: 'image',
                    x: startX,
                    y: startY,
                    width: tempImg.width / 2, // Default to half size of the compressed image for better UX
                    height: tempImg.height / 2,
                    strokeColor: 'transparent',
                    strokeWidth: 0,
                    data: compressedBase64
                }

                if (yElementsRef.current) {
                    yElementsRef.current.push([newElement])
                }

                setElements(prev => [...prev, newElement])
                setActiveTool('selection') // Switch to selection tool to move/resize
            }

        } catch (error) {
            console.error("Image upload failed", error)
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    // ... (Render UI)
    const showProperties = !['hand', 'selection', 'eraser', 'image'].includes(activeTool)
    const showEraserProps = activeTool === 'eraser'
    const showTextProps = activeTool === 'text'

    return (
        <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-background overflow-hidden relative">
            {/* Header */}
            <div className="flex items-center p-4 bg-white dark:bg-card border-b border-gray-200 dark:border-border shrink-0 h-[73px] z-10 relative transition-colors">
                <Link href="../" className="flex items-center text-slate-500 dark:text-muted-foreground hover:text-slate-800 dark:hover:text-primary transition-colors">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    <span className="font-medium">Back to Dashboard</span>
                </Link>

                {/* Save Status Indicator & Share Button */}
                <div className="ml-auto flex items-center gap-2 md:gap-4 text-sm text-slate-400 dark:text-muted-foreground">
                    {saveStatus === 'saving' ? (
                        <div className="flex items-center">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            <span className="hidden md:inline">Saving...</span>
                        </div>
                    ) : (
                        <div className="flex items-center">
                            <Cloud className="w-4 h-4 mr-2" />
                            <span className="hidden md:inline">Saved</span>
                        </div>
                    )}

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 md:h-9 md:w-auto md:px-3 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full md:rounded-md p-0 md:p-2 border md:border-transparent border-slate-200 bg-slate-50 md:bg-transparent dark:text-muted-foreground dark:hover:text-primary dark:hover:bg-muted dark:bg-muted/10">
                                <span className="mr-2 hidden md:inline">Share</span>
                                <Share className="w-4 h-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Share</DialogTitle>
                                <DialogDescription>
                                    Share this whiteboard with others.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col gap-4 py-4">
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex gap-3">
                                            <div className="mt-1 bg-slate-100 dark:bg-muted p-2 rounded-full">
                                                <Globe className="w-4 h-4 text-slate-500 dark:text-muted-foreground" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-medium leading-none">General Access</h4>
                                                <p className="text-xs text-slate-500 dark:text-muted-foreground max-w-[200px]">
                                                    {isPublic
                                                        ? "Anyone on the internet with the link can view"
                                                        : "Only you can access this whiteboard"}
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleShareToggle}
                                            className="shrink-0"
                                        >
                                            {isPublic ? "Anyone with the link" : "Restricted"}
                                            {/* Chevron could go here */}
                                        </Button>
                                    </div>

                                    {isPublic && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-muted border rounded-md overflow-hidden">
                                                <Globe className="w-3 h-3 text-slate-400 dark:text-muted-foreground shrink-0" />
                                                <input
                                                    className="flex-1 text-xs bg-transparent text-slate-600 dark:text-foreground outline-none truncate"
                                                    readOnly
                                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/whiteboard/${roomId}`}
                                                />
                                            </div>
                                            <Button onClick={copyLink} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                                                <Copy className="w-3 h-3 mr-2" />
                                                Copy Link
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-muted/50 -mx-6 -mb-6 px-6 py-4 flex justify-between items-center border-t dark:border-border">
                                <span className="text-xs text-slate-400 dark:text-muted-foreground">
                                    Update permissions to allow others to edit (Coming Soon)
                                </span>
                                <Button variant="default" size="sm" onClick={() => document.querySelector('[data-state="open"]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))}>
                                    Done
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 md:h-9 md:w-auto md:px-3 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full md:rounded-md p-0 md:p-2 border md:border-transparent border-slate-200 bg-slate-50 md:bg-transparent dark:text-muted-foreground dark:hover:text-primary dark:hover:bg-muted dark:bg-muted/10 ml-2"
                        onClick={handleExportImage}
                        title="Export as Image"
                    >
                        <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        <span className="hidden md:inline">Export</span>
                    </Button>
                </div>
            </div>

            {/* Canvas Container */}
            <div ref={containerRef} className="flex-1 relative w-full bg-white dark:bg-background overflow-hidden">
                {/* Dot Grid Background for Dark Mode */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-0 dark:opacity-20 transition-opacity duration-300"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                        transform: `translate(${panOffset.x % 20}px, ${panOffset.y % 20}px)`
                    }}
                />

                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startTouchDrawing}
                    onTouchMove={touchDraw}
                    onTouchEnd={stopDrawing}
                    className="block touch-none absolute inset-0"
                    style={{ cursor: getCursorStyle() }}
                />

                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                />

                {/* Toolbar */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-sm border border-gray-200 p-1 hidden md:flex gap-1 z-10 overflow-x-auto max-w-[95vw] hide-scrollbar">
                    {/* Undo/Redo Group */}
                    <div className="flex gap-1 pr-2 border-r border-gray-200 mr-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleUndo} title="Undo">
                            <Undo className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleRedo} title="Redo">
                            <Redo className="w-5 h-5" />
                        </Button>
                    </div>

                    {tools.map(tool => (
                        <Button
                            key={tool.id}
                            variant={activeTool === tool.id ? "default" : "ghost"}
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => {
                                if (tool.id === 'image') {
                                    fileInputRef.current?.click()
                                } else {
                                    setActiveTool(tool.id)
                                }
                            }}
                            title={tool.id.charAt(0).toUpperCase() + tool.id.slice(1)}
                        >
                            {tool.icon}
                        </Button>
                    ))}
                </div>

                {/* Zoom Controls */}
                <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-30">
                    <div className="flex flex-col bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden items-center">
                        <Button variant="ghost" size="icon" className="h-8 w-9 rounded-none hover:bg-slate-100" onClick={handleZoomIn} title="Zoom In">
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                        <div className="h-px bg-gray-200 w-full" />
                        <button
                            className="h-6 w-9 flex items-center justify-center text-[10px] font-medium text-slate-600 hover:bg-slate-50 transition-colors bg-white select-none"
                            onClick={() => setZoom(1)}
                            title="Reset Zoom"
                        >
                            {Math.round(zoom * 100)}%
                        </button>
                        <div className="h-px bg-gray-200 w-full" />
                        <Button variant="ghost" size="icon" className="h-8 w-9 rounded-none hover:bg-slate-100" onClick={handleZoomOut} title="Zoom Out">
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Mobile Tools FAB (Floating Action Button) */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 md:hidden">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-transform active:scale-95"
                    >
                        <Menu className="w-6 h-6 text-black" />
                    </button>
                </div>

                {/* Mobile Tools Overlay */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:hidden animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative animate-in zoom-in-95 duration-200">
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">Select Tool</h3>

                            <div className="grid grid-cols-4 gap-4">
                                {tools.map(tool => (
                                    <button
                                        key={tool.id}
                                        onClick={() => {
                                            if (tool.id === 'image') {
                                                fileInputRef.current?.click()
                                            } else {
                                                setActiveTool(tool.id)
                                            }
                                            setIsMobileMenuOpen(false)
                                        }}
                                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all aspect-square ${activeTool === tool.id
                                            ? 'bg-blue-50 border-2 border-blue-500 text-blue-600'
                                            : 'bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        {tool.icon}
                                        <span className="text-[10px] font-medium capitalize">{tool.id}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Properties Toolbar */}
                {(showProperties || showEraserProps || showTextProps) && (
                    <div className="absolute top-20 md:top-4 md:right-4 left-4 md:left-auto flex flex-col gap-4 p-4 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-xl z-20 w-64">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                            {activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} Properties
                        </h3>

                        {/* Stroke Color */}
                        {showProperties && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-600">Stroke Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            onClick={() => setToolOptions({ ...toolOptions, strokeColor: c.value })}
                                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${toolOptions.strokeColor === c.value
                                                ? 'border-gray-900 scale-110 shadow-sm'
                                                : 'border-transparent'
                                                }`}
                                            style={{ backgroundColor: c.value }}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Text Properties */}
                        {showTextProps && (
                            <>
                                {/* Stroke Color (Text Color) */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-600">Text Color</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLORS.map(c => (
                                            <button
                                                key={c.value}
                                                onClick={() => setToolOptions({ ...toolOptions, strokeColor: c.value })}
                                                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${toolOptions.strokeColor === c.value
                                                    ? 'border-gray-900 scale-110 shadow-sm'
                                                    : 'border-transparent'
                                                    }`}
                                                style={{ backgroundColor: c.value }}
                                                title={c.name}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Font Family */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-600">Font</label>
                                    <div className="flex flex-wrap gap-2">
                                        {FONTS.map(f => (
                                            <button
                                                key={f.value}
                                                onClick={() => setToolOptions({ ...toolOptions, fontFamily: f.value })}
                                                className={`px-3 py-1 text-xs rounded-md border transition-all ${toolOptions.fontFamily === f.value
                                                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                                                    }`}
                                                style={{ fontFamily: f.value }}
                                            >
                                                {f.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Text Alignment */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-600">Alignment</label>
                                    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-max">
                                        {ALIGNS.map(a => (
                                            <button
                                                key={a.value}
                                                onClick={() => setToolOptions({ ...toolOptions, textAlign: a.value })}
                                                className={`p-1.5 rounded-md transition-all ${toolOptions.textAlign === a.value
                                                    ? 'bg-white shadow-sm text-gray-900'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                title={a.value.charAt(0).toUpperCase() + a.value.slice(1)}
                                            >
                                                {a.icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Stroke Width / Eraser Size (Hide for Text) */}
                        {(!showTextProps) && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-600">
                                    {activeTool === 'eraser' ? 'Eraser Size' : 'Stroke Width'}
                                </label>
                                <div className="flex items-center gap-2">
                                    {WIDTHS.map(w => (
                                        <button
                                            key={w}
                                            onClick={() => setToolOptions({ ...toolOptions, strokeWidth: w })}
                                            className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all ${toolOptions.strokeWidth === w
                                                ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500 ring-offset-1'
                                                : 'hover:bg-gray-100 text-gray-500'
                                                }`}
                                        >
                                            <div
                                                className="rounded-full bg-current"
                                                style={{ width: activeTool === 'eraser' ? Math.min(w * 2, 20) : w, height: activeTool === 'eraser' ? Math.min(w * 2, 20) : w }}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Text Input Overlay */}
                {writingText && (
                    <>
                        <textarea
                            ref={textAreaRef}
                            className="absolute border border-blue-500 p-1 outline-none resize-none font-sans text-[20px] leading-none z-30 shadow-md rounded-md"
                            style={{
                                top: writingText.y * zoom + panOffset.y,
                                left: writingText.x * zoom + panOffset.x,
                                width: `${200 * zoom}px`,
                                height: `${100 * zoom}px`, // Explicit default size
                                fontSize: `${20 * zoom}px`,
                                // Adaptive Background
                                backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                // Adaptive Text Color
                                color: (() => {
                                    let c = toolOptions.strokeColor
                                    if (isDark) {
                                        if (c === 'black' || c === '#000000') return 'white'
                                        if (c === 'white' || c === '#ffffff') return 'black'
                                    } else {
                                        if (c === 'white' || c === '#ffffff') return 'black'
                                    }
                                    return c
                                })(),
                                fontFamily: toolOptions.fontFamily,
                                textAlign: toolOptions.textAlign as any
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            value={writingText.text}
                            onChange={(e) => setWritingText({ ...writingText, text: e.target.value })}
                            onBlur={() => {
                                // Only complete if we aren't just clicking the drag handle
                                // Checking related target is tricky here. 
                                // Let's rely on explicit Enter or clicking outside.
                                // actually blur is fine usually.
                                // console.log("Textarea blurred")
                                // handleTextComplete() 
                            }}
                            placeholder="Type here..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleTextComplete()
                                }
                                if (e.key === 'Escape') {
                                    setWritingText(null) // Cancel
                                }
                            }}
                        />
                        {/* Drag Handle for Text Area */}
                        <div
                            className="absolute bg-blue-500 text-white p-1 rounded-t-md cursor-move flex items-center justify-center shadow-md hover:bg-blue-600 z-40"
                            style={{
                                top: writingText.y * zoom + panOffset.y - 24, // Above the input
                                left: writingText.x * zoom + panOffset.x,
                                width: '30px',
                                height: '24px'
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                // Set the flag. The `draw` (mousemove) function will handle the actual position updates.
                                setIsDraggingTextRef(true)
                                // Reset textDragStartRef to null so the first mousemove can initialize it
                                textDragStartRef.current = null
                            }}
                        >
                            <Move className="w-3 h-3" />
                        </div>
                    </>
                )}


            </div>
        </div>
    )
}

// Helper for Hit Testing
function isHit(element: CanvasElement, x: number, y: number, context: CanvasRenderingContext2D | null): boolean {
    if (!context) return false

    switch (element.type) {
        case 'text':
            if (!element.text) return false
            context.font = `20px ${element.fontFamily || 'sans-serif'}`
            const metrics = context.measureText(element.text)
            const textW = metrics.width
            const textH = 20; // Approx height
            // Text is drawn at y+20. So bounds are [y, y+20] roughly.
            // Let's use a slightly generous box
            return x >= element.x && x <= element.x + textW && y >= element.y && y <= element.y + 30
        case 'pencil':
        case 'eraser':
            if (!element.points) return false
            // Optimization: check bounding box first
            const xs = element.points.map(p => p.x)
            const ys = element.points.map(p => p.y)
            const minX = Math.min(...xs) - 10
            const maxX = Math.max(...xs) + 10
            const minY = Math.min(...ys) - 10
            const maxY = Math.max(...ys) + 10
            return x >= minX && x <= maxX && y >= minY && y <= maxY
        default:
            // box shapes
            const bx = element.x
            const by = element.y
            const bw = element.width
            const bh = element.height

            // Normalize rect
            const rx = bw < 0 ? bx + bw : bx
            const ry = bh < 0 ? by + bh : by
            const rw = Math.abs(bw)
            const rh = Math.abs(bh)

            return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh
    }
}
