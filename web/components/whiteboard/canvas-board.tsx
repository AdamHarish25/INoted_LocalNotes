"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { HocuspocusProvider } from "@hocuspocus/provider"
import * as Y from "yjs"
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
    Eraser
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
    points?: { x: number; y: number }[]
    text?: string
}

export default function CanvasBoard({ roomId }: { roomId: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)
    const [activeTool, setActiveTool] = useState<Tool>('pencil')

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

    // Setup Collaboration
    useEffect(() => {
        const ydoc = new Y.Doc()

        // Use environment variable or default, ensuring wss/ws protocol
        let hostUrl = (process.env.NEXT_PUBLIC_COLLAB_SERVER_URL || 'ws://127.0.0.1:1234')
        if (hostUrl.startsWith('http')) hostUrl = hostUrl.replace(/^http/, 'ws')
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && !hostUrl.startsWith('wss:')) {
            hostUrl = hostUrl.replace('ws://', 'wss://')
        }

        const provider = new HocuspocusProvider({
            url: hostUrl,
            name: roomId,
            document: ydoc,
        })

        const yArray = ydoc.getArray<CanvasElement>("elements")
        yElementsRef.current = yArray

        // Sync Listener
        const handleSync = () => {
            setElements(yArray.toArray())
        }

        // Initial Load
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
                ctx.strokeStyle = 'black'
                ctx.lineWidth = 2
                ctx.font = '20px sans-serif'
                setContext(ctx)
            }
        }
    }, [])

    // Render Loop
    const renderCanvas = () => {
        if (!context || !canvasRef.current) return

        // 1. Clear
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

        context.save()
        context.translate(panOffset.x, panOffset.y)

        // 2. Draw Saved Elements
        elements.forEach(el => drawElement(context, el))

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
        const { type, x, y, width, height, strokeColor, points, text } = element
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = 2
        ctx.fillStyle = strokeColor // For text
        ctx.beginPath()

        switch (type) {
            case 'text':
                if (text) {
                    ctx.font = '20px sans-serif'
                    ctx.fillText(text, x, y + 20) // +20 to align with top-left coordinate system roughly
                }
                break
            case 'rectangle':
                ctx.strokeRect(x, y, width, height)
                break
            case 'circle':
                // Ellipse based on bounding box
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
                // Main line
                const endX = x + width
                const endY = y + height
                ctx.moveTo(x, y)
                ctx.lineTo(endX, endY)
                ctx.stroke()

                // Arrowhead calculation
                const angle = Math.atan2(endY - y, endX - x)
                const headLen = 10
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
                        ctx.lineWidth = 20
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

    // Handle cursor style
    const getCursorStyle = () => {
        switch (activeTool) {
            case 'hand': return 'grab'
            case 'selection': return 'default'
            case 'text': return 'text'
            default: return 'crosshair'
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
    }, [elements]) // Re-bind if elements change so renderCanvas has access

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        // Prevent interaction if clicking on UI elements overlaying the canvas
        // This stops the text box from resetting if you click inside it
        if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'BUTTON') return

        if (!context) return
        const { offsetX, offsetY } = e.nativeEvent

        if (activeTool === 'hand') {
            console.log("Started Panning at:", offsetX, offsetY)
            setIsPanning(true)
            setStartPanMousePosition({ x: offsetX, y: offsetY })
            return
        }

        if (activeTool === 'text') {
            // Prevent default browser behavior that might steal focus back immediately
            e.preventDefault()

            // Check if we are already writing text.
            // If so, clicking elsewhere should commit the current text first (via blur),
            // effectively creating a new one in the next tick, but let's be safe.
            // If input is active, do nothing (let blur handle it)
            if (writingText) return

            console.log("Initiating Text Tool at:", offsetX, offsetY)
            // Adjust click coordinates by subtracting pan offset to get "Virtual World" coordinates
            const worldX = offsetX - panOffset.x
            const worldY = offsetY - panOffset.y
            setWritingText({ x: worldX, y: worldY, text: '' })
            return
        }

        if (['selection'].includes(activeTool)) return

        console.log(`Started Drawing [${activeTool}] at:`, offsetX, offsetY)
        setIsDrawing(true)

        // Convert Mouse Screen Coords -> World Coords
        const x = offsetX - panOffset.x
        const y = offsetY - panOffset.y

        const id = crypto.randomUUID()

        if (activeTool === 'pencil' || activeTool === 'eraser') {
            setCurrentElement({
                id,
                type: activeTool,
                x,
                y,
                width: 0,
                height: 0,
                strokeColor: 'black',
                points: [{ x, y }]
            })
        } else {
            // Shapes start at 0 width/height
            setCurrentElement({
                id,
                type: activeTool,
                x,
                y,
                width: 0,
                height: 0,
                strokeColor: 'black'
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
                strokeColor: 'black',
                text: writingText.text
            }
            if (yElementsRef.current) {
                yElementsRef.current.push([newElement])
            }
        } else {
            console.log("Cancelled Text (Empty)")
        }
        setWritingText(null)
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

    return (
        <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center p-4 bg-white border-b border-gray-200 shrink-0 h-[73px] z-10 relative">
                <Link href="/dashboard" className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    <span className="font-medium">Back to Dashboard</span>
                </Link>
                <div className="ml-auto text-sm text-slate-400">
                    Custom HTML5 Canvas
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

                {/* Text Input Overlay */}
                {writingText && (
                    <textarea
                        ref={textAreaRef}
                        className="absolute border border-blue-500 p-1 outline-none resize-none font-sans text-[20px] leading-none z-30 shadow-md rounded-md"
                        style={{
                            top: writingText.y + panOffset.y,
                            left: writingText.x + panOffset.x,
                            width: '200px',
                            height: '100px', // Explicit default size
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            color: 'black'
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        value={writingText.text}
                        onChange={(e) => setWritingText({ ...writingText, text: e.target.value })}
                        onBlur={() => {
                            console.log("Textarea blurred")
                            handleTextComplete()
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
                )}

                {/* Toolbar */}
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
