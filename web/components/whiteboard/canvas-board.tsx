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
    ZoomOut,
    Download,
    Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type Tool = 'hand' | 'selection' | 'rectangle' | 'circle' | 'diamond' | 'arrow' | 'line' | 'pencil' | 'text' | 'eraser' | 'image' | 'undo' | 'redo'

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

// Helper for random colors
const getRandomColor = () => {
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#ec4899', '#14b8a6']
    return colors[Math.floor(Math.random() * colors.length)]
}

export default function CanvasBoard({ roomId, initialData, initialIsPublic = false, currentUser }: { roomId: string, initialData?: any[], initialIsPublic?: boolean, currentUser?: any }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)
    const [activeTool, setActiveTool] = useState<Tool>('hand')
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Remote Cursors State
    const [remoteCursors, setRemoteCursors] = useState<{ [key: number]: { x: number, y: number, name: string, color: string, avatar?: string | null, role?: string, hasCursor?: boolean } }>({})
    const providerRef = useRef<HocuspocusProvider | null>(null)


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

    // Supabase Client (replaced by Server Actions)
    // const supabase = createClient()

    // Save Status State
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')

    // Share State
    const [isPublic, setIsPublic] = useState(initialIsPublic)
    const [isCopied, setIsCopied] = useState(false)

    // Sharing Permission Role
    const [accessRole, setAccessRole] = useState<'viewer' | 'editor' | 'commenter'>('viewer')

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, elementId: string } | null>(null)

    // Connection Status State
    const [connectionStatus, setConnectionStatus] = useState('disconnected')

    const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault()
        if (!context || !canvasRef.current) return

        const { offsetX, offsetY } = e.nativeEvent
        const worldX = (offsetX - panOffset.x) / zoom
        const worldY = (offsetY - panOffset.y) / zoom

        // Check if hitting an element (reverse iteration for z-index)
        let hitId: string | null = null
        for (let i = elements.length - 1; i >= 0; i--) {
            if (isHit(elements[i], worldX, worldY, context)) {
                hitId = elements[i].id
                break
            }
        }

        if (hitId) {
            setContextMenu({
                x: e.clientX,
                y: e.clientY,
                elementId: hitId
            })
        } else {
            setContextMenu(null)
        }
    }

    const handleDeleteComponent = () => {
        if (!contextMenu) return

        // Remove from local state and Yjs
        const index = elements.findIndex(el => el.id === contextMenu.elementId)
        if (index !== -1) {
            const newElements = [...elements]
            newElements.splice(index, 1)
            setElements(newElements)

            if (yElementsRef.current) {
                yElementsRef.current.delete(index, 1)
            }
        }
        setContextMenu(null)
    }

    // Close context menu on click elsewhere
    useEffect(() => {
        const handleClick = () => setContextMenu(null)
        window.addEventListener('click', handleClick)
        return () => window.removeEventListener('click', handleClick)
    }, [])



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

    const handleExportJSON = () => {
        const jsonString = JSON.stringify(elements, null, 2)
        const blob = new Blob([jsonString], { type: 'application/json' })
        const link = document.createElement('a')
        link.download = `whiteboard-${roomId}.json`
        link.href = URL.createObjectURL(blob)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleExportSVG = () => {
        if (!canvasRef.current) return
        const width = canvasRef.current.width
        const height = canvasRef.current.height

        let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`

        // Background
        svgContent += `<rect width="100%" height="100%" fill="${isDark ? '#000000' : '#ffffff'}"/>`

        elements.forEach(el => {
            let stroke = el.strokeColor
            if (isDark) {
                if (stroke === 'black' || stroke === '#000000') stroke = 'white'
                else if (stroke === 'white' || stroke === '#ffffff') stroke = 'black'
            } else {
                if (stroke === 'white' || stroke === '#ffffff') stroke = 'black'
            }

            const sw = el.strokeWidth || 2

            switch (el.type) {
                case 'rectangle':
                    svgContent += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" stroke="${stroke}" stroke-width="${sw}" fill="none"/>`
                    break
                case 'circle':
                    // el.x/y is top-left, width is width. ellipse cx = x + w/2
                    svgContent += `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" rx="${Math.abs(el.width / 2)}" ry="${Math.abs(el.height / 2)}" stroke="${stroke}" stroke-width="${sw}" fill="none"/>`
                    break
                case 'line':
                    svgContent += `<line x1="${el.x}" y1="${el.y}" x2="${el.x + el.width}" y2="${el.y + el.height}" stroke="${stroke}" stroke-width="${sw}"/>`
                    break
                case 'arrow':
                    // Main line
                    const endX = el.x + el.width
                    const endY = el.y + el.height
                    svgContent += `<line x1="${el.x}" y1="${el.y}" x2="${endX}" y2="${endY}" stroke="${stroke}" stroke-width="${sw}"/>`
                    // Arrowhead
                    const angle = Math.atan2(endY - el.y, endX - el.x)
                    const headLen = 10 + sw
                    const x1 = endX - headLen * Math.cos(angle - Math.PI / 6)
                    const y1 = endY - headLen * Math.sin(angle - Math.PI / 6)
                    const x2 = endX - headLen * Math.cos(angle + Math.PI / 6)
                    const y2 = endY - headLen * Math.sin(angle + Math.PI / 6)
                    svgContent += `<path d="M ${endX} ${endY} L ${x1} ${y1} M ${endX} ${endY} L ${x2} ${y2}" stroke="${stroke}" stroke-width="${sw}" fill="none"/>`
                    break
                case 'pencil':
                case 'eraser':
                    if (el.points && el.points.length > 0) {
                        const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                        // For eraser, we might want to mask? SVG doesn't do 'destination-out' easily without masks.
                        // For now, if eraser, we just paint background color line?
                        const finalS = el.type === 'eraser' ? (isDark ? 'black' : 'white') : stroke
                        const finalW = el.type === 'eraser' ? (sw * 2.5) : sw
                        svgContent += `<path d="${d}" stroke="${finalS}" stroke-width="${finalW}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
                    }
                    break
                case 'text':
                    if (el.text) {
                        // Escape text
                        const escaped = el.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                        svgContent += `<text x="${el.x}" y="${el.y + 20}" fill="${stroke}" font-family="${el.fontFamily || 'sans-serif'}" font-size="20" text-anchor="${(el.textAlign === 'center' ? 'middle' : (el.textAlign === 'right' ? 'end' : 'start'))}">${escaped}</text>`
                    }
                    break
                case 'image':
                    if (el.data) {
                        svgContent += `<image href="${el.data}" x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}"/>`
                    }
                    break
            }
        })

        svgContent += `</svg>`

        const blob = new Blob([svgContent], { type: 'image/svg+xml' })
        const link = document.createElement('a')
        link.download = `whiteboard-${roomId}.svg`
        link.href = URL.createObjectURL(blob)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Debounced Save to Supabase
    useEffect(() => {
        if (elements.length === 0) return

        const saveToDb = async () => {
            setSaveStatus('saving')
            console.log("Saving to Supabase (Server Action)...")
            try {
                const { updateWhiteboard } = await import("@/app/actions")
                // Only send necessary data to reduce payload if possible, but here we send all elements
                // Sanitize elements to ensure no non-serializable data
                const sanitizedElements = JSON.parse(JSON.stringify(elements))

                const payload = {
                    elements: sanitizedElements,
                    publicRole: accessRole
                }
                const result = await updateWhiteboard(roomId, { content: payload })

                if (result.error) {
                    console.error("Supabase Save Error:", result.error)
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
    }, [elements, roomId])

    // Setup Collaboration & Awareness
    useEffect(() => {
        const ydoc = new Y.Doc()

        // Initialize with server-fetched data if available and doc is empty
        const yArray = ydoc.getArray<CanvasElement>("elements")
        const yMap = ydoc.getMap("meta")

        if (initialData) {
            if (Array.isArray(initialData)) {
                if (yArray.length === 0 && initialData.length > 0) {
                    yArray.insert(0, initialData as CanvasElement[])
                    setElements(yArray.toArray())
                }
            } else if (typeof initialData === 'object' && (initialData as any).elements) {
                const data = initialData as any
                if (yArray.length === 0 && data.elements.length > 0) {
                    yArray.insert(0, data.elements as CanvasElement[])
                    setElements(yArray.toArray())
                }
                if (data.publicRole && !yMap.has('publicRole')) {
                    yMap.set('publicRole', data.publicRole)
                }
            }
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
            onStatus: (item) => {
                setConnectionStatus(item.status)
            }
        })
        providerRef.current = provider

        // Observer for public role changes
        yMap.observe(() => {
            const remotePublicRole = yMap.get('publicRole') as string
            if (remotePublicRole && !currentUser?.id && isPublic) {
                setAccessRole(remotePublicRole as any)
                if (provider.awareness) {
                    const current = provider.awareness.getLocalState()
                    provider.awareness.setLocalStateField('user', { ...current?.user, role: remotePublicRole })
                }
            }
        })

        // Awareness Setup
        const myColor = getRandomColor()
        const myName = currentUser?.user_metadata?.display_name || currentUser?.email || "Guest " + Math.floor(Math.random() * 1000)
        const myAvatar = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null
        // Determine role: Owner is always editor. For others, it depends on the public setting (simulated for now)
        // In a real app, we'd fetch the specific permission. 
        // For this demo, we assume if it's public, it's 'editor' if the toggle is set to 'editor', otherwise 'viewer'.
        // logic: owner ? editor : (sharedAsEditor ? editor : viewer). 
        // We need a state for 'sharedAsEditor'. Let's assume it's stored in the whiteboard content or separate.
        // For passed props, let's treat currentUser presence as 'editor' if logged in and owner.
        const myRole = currentUser?.id ? 'editor' : (isPublic ? (yMap.get('publicRole') as string || 'viewer') : 'viewer')
        setAccessRole(myRole as any)


        if (provider.awareness) {
            provider.awareness.setLocalStateField('user', {
                name: myName,
                color: myColor,
                avatar: myAvatar,
                role: myRole
            })

            // Listen for remote cursors
            provider.awareness.on('change', () => {
                if (!provider.awareness) return
                const states = provider.awareness.getStates()
                const cursors: any = {}
                states.forEach((state: any, clientId: any) => {
                    // Check awareness again just in case, though closure should capture it? 
                    // Better use providerRef or just optional chaining if strictly needed, but here provider.awareness is truthy in this block.
                    // However, TypeScript might not know that inside the callback if it thinks provider varies.
                    // Actually, 'provider' is const here.
                    if (clientId !== provider.awareness?.clientID && state.user) {
                        cursors[clientId] = {
                            x: state.cursor?.x || 0,
                            y: state.cursor?.y || 0,
                            name: state.user.name,
                            color: state.user.color,
                            avatar: state.user.avatar,
                            role: state.user.role,
                            hasCursor: !!state.cursor
                        }
                    }
                })
                setRemoteCursors(cursors)
            })
        }

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
    }, [roomId, currentUser])

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

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input or textarea
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

            // Undo/Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault()
                if (e.shiftKey) {
                    undoManagerRef.current?.redo()
                } else {
                    undoManagerRef.current?.undo()
                }
                return
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault()
                undoManagerRef.current?.redo()
                return
            }

            // Tools
            switch (e.key.toLowerCase()) {
                case 'v': setActiveTool('selection'); break;
                case 'h': setActiveTool('hand'); break;
                case 'r': setActiveTool('rectangle'); break;
                case 'o': setActiveTool('circle'); break;
                case 'l': setActiveTool('line'); break;
                case 't': setActiveTool('text'); break;
                case 'p': setActiveTool('pencil'); break;
                case 'e': setActiveTool('eraser'); break;
                case 'backspace':
                case 'delete':
                    // Delete selected element logic logic isn't fully in state yet (just draggingElement), 
                    // but if we had a proper selection state we'd do it here.
                    // For now, let's skip unless we track 'selectedElement'
                    break;
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Broadcast Cursor Position
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!providerRef.current || !providerRef.current.awareness) return

        const { left, top } = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - left
        const y = e.clientY - top

        // Broadcast relative to pan/zoom if needed, keeping it screen coords for simple overlay is easier, 
        // but for world-scaling cursors we might want world coords. 
        // Let's stick to screen coords relative to the container for the cursor overlay.

        providerRef.current.awareness.setLocalStateField('cursor', { x, y })

        // Also call drawing logic
        draw(e as unknown as React.MouseEvent<HTMLCanvasElement>)
    }

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
        // Enforce Read Only for Viewers using accessRole state (synced from YMap/Public)
        if (accessRole === 'viewer' && activeTool !== 'hand') return

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
        processDraw(offsetX, offsetY, e.shiftKey)
    }

    const processDraw = (offsetX: number, offsetY: number, isShiftPressed: boolean = false) => {
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
            let w = worldX - currentElement.x
            let h = worldY - currentElement.y

            // Constrain proportions if Shift is pressed
            if (isShiftPressed) {
                // For rectangle/circle/diamond, make it 1:1
                // For line/arrow, this logic snaps to 45/90 degrees usually, but simple square aspect is requested.
                // Let's implement square aspect for shapes and maybe simple snap for lines?
                // The request said "menegakkan ukuran componen ... agar seimbang", which implies Aspect Ratio 1:1.

                if (['rectangle', 'circle', 'diamond'].includes(activeTool)) {
                    const minDim = Math.min(Math.abs(w), Math.abs(h))
                    const maxDim = Math.max(Math.abs(w), Math.abs(h))
                    // Use max dimension to prevent "shrinking" feel when moving mouse far away
                    const dim = maxDim;
                    w = w < 0 ? -dim : dim
                    h = h < 0 ? -dim : dim
                } else if (['line', 'arrow'].includes(activeTool)) {
                    // Straight lines (0, 45, 90 deg)
                    // Not implemented here yet as request specifically mentioned "balanced size" (seimbang)
                }
            }

            setCurrentElement({
                ...currentElement,
                width: w,
                height: h
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

    const tools: { id: Tool | 'undo' | 'redo', icon: React.ReactNode, shortcut?: string }[] = [
        { id: 'hand', icon: <Hand className="w-5 h-5" />, shortcut: 'H' },
        { id: 'selection', icon: <MousePointer2 className="w-5 h-5" />, shortcut: 'V' },
        { id: 'rectangle', icon: <Square className="w-5 h-5" />, shortcut: 'R' },
        { id: 'circle', icon: <Circle className="w-5 h-5" />, shortcut: 'O' },
        { id: 'diamond', icon: <Diamond className="w-5 h-5" /> },
        { id: 'arrow', icon: <ArrowRight className="w-5 h-5" /> },
        { id: 'line', icon: <Minus className="w-5 h-5" />, shortcut: 'L' },
        { id: 'pencil', icon: <Pencil className="w-5 h-5" />, shortcut: 'P' },
        { id: 'text', icon: <Type className="w-5 h-5" />, shortcut: 'T' },
        { id: 'image', icon: <ImageIcon className="w-5 h-5" /> },
        { id: 'eraser', icon: <Eraser className="w-5 h-5" />, shortcut: 'E' },
        { id: 'undo', icon: <Undo className="w-5 h-5" />, shortcut: 'Ctrl+Z' },
        { id: 'redo', icon: <Redo className="w-5 h-5" />, shortcut: 'Ctrl+Y' },
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
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background overflow-hidden relative">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-white dark:bg-card z-50 shadow-sm h-14 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-semibold text-lg hidden md:block">Whiteboard</span>
                    </Link>

                    {/* Toolbar (Moved to Header for desktop, float for mobile) */}
                    <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-muted p-1 rounded-lg border">
                        {/* ... Toolbar Buttons ... */}
                        {/* We can reproduce the toolbar here or keep it floating. Let's keep the existing floating toolbar but maybe show active users here. */}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Active Users List */}
                    <div className="flex items-center -space-x-2 mr-2">
                        {Object.values(remoteCursors).map((user: any, i) => (
                            <div
                                key={i}
                                className={`relative w-8 h-8 rounded-full border-2 ${user.role === 'editor' ? 'border-green-500' : 'border-slate-200'} overflow-hidden bg-slate-200 tooltip-trigger group`}
                                title={`${user.name} (${user.role})`}
                            >
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                        {user.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                        ))}
                        {currentUser && (
                            <div className="relative w-8 h-8 rounded-full border-2 border-green-500 overflow-hidden bg-slate-200 z-10" title="You">
                                {currentUser.user_metadata?.avatar_url ? (
                                    <img src={currentUser.user_metadata?.avatar_url} alt="You" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                        {currentUser.user_metadata?.display_name?.charAt(0) || "U"}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={`flex items-center gap-2 text-xs text-slate-400`}>
                        {/* Connection Status */}
                        <div className="flex items-center gap-1.5 mr-2" title={`Connection: ${connectionStatus}`}>
                            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
                                    connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                                }`} />
                            <span className="hidden sm:inline capitalize">{connectionStatus}</span>
                        </div>

                        {saveStatus === 'saving' ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="hidden sm:inline">Saving...</span>
                            </>
                        ) : (
                            <>
                                <Cloud className="w-3 h-3" />
                                <span className="hidden sm:inline">Saved</span>
                            </>
                        )}
                    </div>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                                <Share className="w-4 h-4" />
                                Share
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Share Whiteboard</DialogTitle>
                                <DialogDescription>Collaborate with others in real-time.</DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                                <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-muted/50">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 font-medium">
                                            <Globe className="w-4 h-4 text-slate-500" />
                                            General Access
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {isPublic ? "Anyone with the link can access" : "Only invited people can access"}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <select
                                            className="text-xs border rounded p-1 bg-white dark:bg-zinc-800"
                                            value={isPublic ? (accessRole) : 'off'}
                                            onChange={(e) => {
                                                if (e.target.value === 'off') {
                                                    // Turn off public
                                                    if (isPublic) handleShareToggle()
                                                } else {
                                                    // Turn on public if was off
                                                    if (!isPublic) handleShareToggle()
                                                    setAccessRole(e.target.value as any)
                                                }
                                            }}
                                        >
                                            <option value="off">Restricted</option>
                                            <option value="viewer">Viewer</option>
                                            <option value="commenter">Commenter</option>
                                            <option value="editor">Editor</option>
                                        </select>
                                    </div>
                                </div>

                                {isPublic && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-muted border rounded-md overflow-hidden">
                                            <input
                                                className="flex-1 text-xs bg-transparent outline-none truncate"
                                                readOnly
                                                value={`${window.location.origin}/whiteboard/${roomId}`}
                                            />
                                        </div>
                                        <Button size="icon" variant="outline" onClick={copyLink}>
                                            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden">
                        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </Button>
                </div>
            </div>

            {/* Canvas Container */}
            <div
                ref={containerRef}
                className="flex-1 relative w-full bg-white dark:bg-background overflow-hidden cursor-crosshair"
                onMouseMove={handleMouseMove} // Use this for cursor tracking instead of canvas onMouseMove for drawing updates only
            >
                {/* Dot Grid Background for Dark Mode */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-0 dark:opacity-20 transition-opacity duration-300"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                        transform: `translate(${panOffset.x % 20}px, ${panOffset.y % 20}px)`
                    }}
                />

                {/* Remote Cursors Overlay */}
                <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                    {Object.entries(remoteCursors).map(([clientId, cursor]) => cursor.hasCursor && (
                        <div
                            key={clientId}
                            className="absolute transition-transform duration-75 ease-out flex flex-col items-start gap-1"
                            style={{
                                transform: `translate(${cursor.x}px, ${cursor.y}px)`,
                            }}
                        >
                            <MousePointer2
                                className="w-4 h-4 fill-current"
                                style={{ color: cursor.color }}
                            />
                            <span
                                className="text-[10px] text-white px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap"
                                style={{ backgroundColor: cursor.color }}
                            >
                                {cursor.name}
                            </span>
                        </div>
                    ))}
                </div>

                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    // onMouseMove={draw} // moved to container handleMouseMove
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startTouchDrawing}
                    onTouchMove={touchDraw}
                    onTouchEnd={stopDrawing}
                    onContextMenu={handleContextMenu}
                    className="block touch-none absolute inset-0 z-10"
                    style={{ cursor: 'none' }} // Hide default cursor? Or maybe just custom? let's stick to default for now, 'none' if drawing pencil
                />

                {/* Context Menu */}
                {contextMenu && (
                    <div
                        className="fixed z-50 bg-white dark:bg-zinc-800 border dark:border-zinc-700 shadow-xl rounded-lg p-1 min-w-[120px] animate-in fade-in zoom-in-95 duration-100"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={handleDeleteComponent}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                )}

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

                    {tools.filter(t => !['undo', 'redo', 'zoomIn', 'zoomOut'].includes(t.id)).map(tool => (
                        <Button
                            key={tool.id}
                            variant={activeTool === tool.id ? "default" : "ghost"}
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => {
                                if (tool.id === 'image') {
                                    fileInputRef.current?.click()
                                } else {
                                    setActiveTool(tool.id as Tool)
                                }
                            }}
                            title={`${tool.id.charAt(0).toUpperCase() + tool.id.slice(1)} ${tool.shortcut ? `(${tool.shortcut})` : ''}`}
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
                {/* Mobile Bottom Bar (Tools & Nav) */}
                <div className="absolute bottom-6 left-0 right-0 z-30 md:hidden flex items-center justify-center gap-6 pointer-events-none">
                    {/* Tools Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="pointer-events-auto flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-transform active:scale-95"
                    >
                        <Menu className="w-6 h-6" />
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
                                            } else if (tool.id === 'undo') {
                                                handleUndo()
                                            } else if (tool.id === 'redo') {
                                                handleRedo()
                                            } else {
                                                setActiveTool(tool.id as Tool)
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
