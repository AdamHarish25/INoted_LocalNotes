"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { HocuspocusProvider } from "@hocuspocus/provider"
import * as Y from "yjs"
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
    Move
} from "lucide-react"
import { Button } from "@/components/ui/button"

type Tool = 'hand' | 'selection' | 'rectangle' | 'circle' | 'diamond' | 'arrow' | 'line' | 'pencil' | 'text' | 'eraser'

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
}

const COLORS = [
    { name: 'Black', value: 'black' },
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

export default function CanvasBoard({ roomId, initialData }: { roomId: string, initialData?: any[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)
    const [activeTool, setActiveTool] = useState<Tool>('pencil')

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

    // Supabase Client
    const supabase = createClient()

    // Save Status State
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')

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

        yArray.observe(handleSync)

        return () => {
            provider.destroy()
            ydoc.destroy()
        }
    }, [roomId])

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
        context.translate(panOffset.x, panOffset.y)

        // 2. Draw Saved Elements
        elements.forEach(el => {
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

    // Trigger render when elements or transform change
    useEffect(() => {
        renderCanvas()
    }, [elements, currentElement, context, panOffset])

    // Helper to draw a single element
    const drawElement = (ctx: CanvasRenderingContext2D, element: CanvasElement) => {
        const { type, x, y, width, height, strokeColor, points, text, strokeWidth } = element

        ctx.strokeStyle = strokeColor
        ctx.lineWidth = strokeWidth || 2
        ctx.fillStyle = strokeColor // For text

        ctx.beginPath()

        switch (type) {
            case 'text':
                if (text) {
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
                    points.forEach(p => ctx.lineTo(p.x, p.y))
                    if (type === 'eraser') {
                        ctx.save()
                        ctx.globalCompositeOperation = 'destination-out'
                        ctx.lineWidth = strokeWidth ? strokeWidth * 5 : 20 // Eraser is wider
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

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        // Prevent interaction if clicking on UI elements
        if ((e.target as HTMLElement).tagName !== 'CANVAS') return

        if (!context) return
        const { offsetX, offsetY } = e.nativeEvent

        if (activeTool === 'hand') {
            setIsPanning(true)
            setStartPanMousePosition({ x: offsetX, y: offsetY })
            return
        }

        if (activeTool === 'text') {
            e.preventDefault()
            if (writingText) return

            const worldX = offsetX - panOffset.x
            const worldY = offsetY - panOffset.y
            setWritingText({ x: worldX, y: worldY, text: '' })
            return
        }

        if (activeTool === 'selection') {
            const worldX = offsetX - panOffset.x
            const worldY = offsetY - panOffset.y

            // Find clicked element (reverse order to find top-most first)
            for (let i = elements.length - 1; i >= 0; i--) {
                const el = elements[i]
                if (isHit(el, worldX, worldY, context)) {
                    setDraggingElement({
                        id: el.id,
                        startX: worldX,
                        startY: worldY,
                        initialElementX: el.x,
                        initialElementY: el.y
                    })
                    setIsDrawing(true) // Re-use isDrawing to capture mouse moves globally if needed, or just use separate state
                    return
                }
            }
            return
        }

        if (['selection'].includes(activeTool)) return

        setIsDrawing(true)

        const x = offsetX - panOffset.x
        const y = offsetY - panOffset.y
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

        if (isPanning) {
            const deltaX = offsetX - startPanMousePosition.x
            const deltaY = offsetY - startPanMousePosition.y
            setPanOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }))
            setStartPanMousePosition({ x: offsetX, y: offsetY })
            return
        }

        // Handle Moving the Text Input Box (Direct DOM manipulation for performance)
        if (isDraggingTextRef && writingText && textAreaRef.current) {
            const worldX = offsetX - panOffset.x
            const worldY = offsetY - panOffset.y

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
            const worldX = offsetX - panOffset.x
            const worldY = offsetY - panOffset.y
            const deltaX = worldX - draggingElement.startX
            const deltaY = worldY - draggingElement.startY

            // Update Ref instead of State
            dragOffsetRef.current = { x: deltaX, y: deltaY }

            // Request Render
            requestAnimationFrame(renderCanvas)
            return
        }

        if (!isDrawing || !currentElement) return

        const worldX = offsetX - panOffset.x
        const worldY = offsetY - panOffset.y

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
        { id: 'eraser', icon: <Eraser className="w-5 h-5" /> },
    ]

    // ... (Render UI)
    const showProperties = !['hand', 'selection', 'eraser'].includes(activeTool)
    const showEraserProps = activeTool === 'eraser'
    const showTextProps = activeTool === 'text'

    return (
        <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center p-4 bg-white border-b border-gray-200 shrink-0 h-[73px] z-10 relative">
                <Link href="/dashboard" className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    <span className="font-medium">Back to Dashboard</span>
                </Link>

                {/* Save Status Indicator */}
                <div className="ml-auto flex items-center text-sm text-slate-400">
                    {saveStatus === 'saving' ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <Cloud className="w-4 h-4 mr-2" />
                            <span>Saved to Cloud</span>
                        </>
                    )}
                </div>
            </div>

            {/* Canvas Container */}
            <div ref={containerRef} className="flex-1 relative w-full bg-white overflow-hidden">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="block touch-none absolute inset-0"
                    style={{ cursor: getCursorStyle() }}
                />

                {/* Properties Toolbar (Left) */}
                {(showProperties || showEraserProps || showTextProps) && (
                    <div className="absolute top-4 left-4 flex flex-col gap-4 p-4 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-xl z-20 w-64">
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
                                top: writingText.y + panOffset.y,
                                left: writingText.x + panOffset.x,
                                width: '200px',
                                height: '100px', // Explicit default size
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                color: toolOptions.strokeColor, // Use Tool Color
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
                                top: writingText.y + panOffset.y - 24, // Above the input
                                left: writingText.x + panOffset.x,
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

                {/* Tools Toolbar (Bottom) */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-[#4285F4] rounded-lg shadow-xl z-20">
                    {tools.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id)}
                            className={`p-2 rounded-md text-white transition-all ${activeTool === tool.id
                                ? 'bg-white/30 shadow-sm ring-1 ring-white/40'
                                : 'hover:bg-white/20'
                                }`}
                            title={tool.id.charAt(0).toUpperCase() + tool.id.slice(1)}
                        >
                            {tool.icon}
                        </button>
                    ))}
                </div>
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
