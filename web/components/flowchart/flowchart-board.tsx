"use client"

import React, { useEffect, useRef, useState } from "react"
import { Stage, Layer, Rect, Circle, Text as KonvaText, Line, Transformer, RegularPolygon, Path, Group, Arrow } from "react-konva"
import { HocuspocusProvider } from "@hocuspocus/provider"
import * as Y from "yjs"
import { Button } from "@/components/ui/button"
import { Square, Circle as CircleIcon, Type, MousePointer2, Save, Undo, Redo, Phone, Database, Hexagon, Component, RectangleHorizontal, Diamond, Trash2, Pencil, RefreshCw, ArrowRight } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Loader2, Cloud } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useTheme } from "next-themes"

interface FlowchartElement {
    id: string
    type: 'rectangle' | 'circle' | 'text' | 'arrow' | 'diamond' | 'cylinder' | 'parallelogram' | 'rounded_rect' | 'connection'
    x?: number
    y?: number
    width?: number
    height?: number
    fill?: string
    stroke?: string
    text?: string
    points?: number[]
    rotation?: number
    startId?: string
    endId?: string
    manualPosition?: number // For orthogonal connector adjustment
}

// Helper to get all anchor points
const getAllAnchors = (node: FlowchartElement) => {
    const w = node.width || 100
    const h = node.height || 60
    const x = node.x || 0
    const y = node.y || 0

    return [
        { x: x + w / 2, y: y, side: 'top' },        // Top
        { x: x + w, y: y + h / 2, side: 'right' },  // Right
        { x: x + w / 2, y: y + h, side: 'bottom' }, // Bottom
        { x: x, y: y + h / 2, side: 'left' }        // Left
    ]
}

// Helper to find the closest anchor point (N/S/E/W)
const getAnchorPoint = (node: FlowchartElement, target: { x: number, y: number }) => {
    const anchors = getAllAnchors(node)
    // Find closest anchor to target
    let closest = anchors[0]
    let minDist = Infinity

    anchors.forEach(a => {
        const dist = Math.pow(a.x - target.x, 2) + Math.pow(a.y - target.y, 2)
        if (dist < minDist) {
            minDist = dist
            closest = a
        }
    })

    return closest
}

// Calculate orthogonal points with Smart Anchors
const getOrthogonalPoints = (startNode: FlowchartElement, endNode: FlowchartElement, manualPos?: number) => {
    const startCenter = { x: (startNode.x || 0) + (startNode.width || 0) / 2, y: (startNode.y || 0) + (startNode.height || 0) / 2 }
    const endCenter = { x: (endNode.x || 0) + (endNode.width || 0) / 2, y: (endNode.y || 0) + (endNode.height || 0) / 2 }

    // 1. Determine best anchors based on relative positions
    // We want the anchor on StartNode that is closest to EndNode center
    const startAnchor = getAnchorPoint(startNode, endCenter)
    // We want the anchor on EndNode that is closest to StartAnchor
    const endAnchor = getAnchorPoint(endNode, startAnchor)

    const p1 = startAnchor
    const p2 = endAnchor

    // 2. Logic for routing
    let points: number[] = []
    let handlePos = { x: 0, y: 0 }
    let isVerticalSegment = false

    // Simple heuristic: if exiting Vertical (Top/Bottom), try to go Vertical first.
    // If exiting Horizontal (Left/Right), try to go Horizontal first.

    const isStartVertical = p1.side === 'top' || p1.side === 'bottom'
    const isEndVertical = p2.side === 'top' || p2.side === 'bottom'

    // Case 1: Opposite sides (e.g. Right to Left) -> S-shape or straight
    // Case 2: Perpendicular (e.g. Right to Top) -> L-shape

    // We'll fallback to the "Mid-Segment" logic but refined by start/end direction

    // If we just use the mid-point logic from before, but starting from anchors:
    const isHorizontalSeparation = Math.abs(p1.x - p2.x) > Math.abs(p1.y - p2.y)

    // Override generic horizontal/vertical decision based on exit side if needed
    // Actually, sticking to the standard 3-segment orthogonal logic usually works well if points are aligned.

    if (isHorizontalSeparation) {
        // Mid-Vertical Segment
        let midX = manualPos !== undefined ? manualPos : (p1.x + p2.x) / 2
        points = [p1.x, p1.y, midX, p1.y, midX, p2.y, p2.x, p2.y]
        handlePos = { x: midX, y: (p1.y + p2.y) / 2 }
        isVerticalSegment = true
    } else {
        // Mid-Horizontal Segment
        let midY = manualPos !== undefined ? manualPos : (p1.y + p2.y) / 2
        points = [p1.x, p1.y, p1.x, midY, p2.x, midY, p2.x, p2.y]
        handlePos = { x: (p1.x + p2.x) / 2, y: midY }
        isVerticalSegment = false
    }

    return { points, handlePos, isVerticalSegment }
}

const COLORS = ['#ef4444', '#3b82f6', '#22c5e', '#eab308', '#a855f7', '#000000', '#ffffff']

export default function FlowchartBoard({ roomId, initialData }: { roomId: string, initialData?: any[] }) {
    const [elements, setElements] = useState<FlowchartElement[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null) // Inline editing state
    const [activeTool, setActiveTool] = useState<'select' | 'rectangle' | 'circle' | 'text' | 'arrow' | 'diamond' | 'cylinder' | 'parallelogram' | 'rounded_rect'>('select')

    // Drag-to-connect state
    const [drawingArrow, setDrawingArrow] = useState<{ startId: string, endPos: { x: number, y: number }, snappedTo?: { nodeId: string, side: string } } | null>(null)

    // Window Size State to prevent hydration mismatch
    const [windowSize, setWindowSize] = useState({ width: 1000, height: 800 })
    const { theme } = useTheme()

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, elementId: string | null }>({ visible: false, x: 0, y: 0, elementId: null })
    const [isTextDialogOpen, setIsTextDialogOpen] = useState(false)
    const [textInput, setTextInput] = useState("")

    // Yjs
    const providerRef = useRef<HocuspocusProvider | null>(null)
    const ydocRef = useRef<Y.Doc | null>(null)
    const yElementsRef = useRef<Y.Array<FlowchartElement> | null>(null)
    const undoManagerRef = useRef<Y.UndoManager | null>(null)

    const stageRef = useRef<any>(null)
    const transformerRef = useRef<any>(null)
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')
    // const supabase = createClient()

    // Handle Window Resize
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleResize = () => {
                setWindowSize({ width: window.innerWidth, height: window.innerHeight - 80 })
            }
            handleResize()
            window.addEventListener('resize', handleResize)
            return () => window.removeEventListener('resize', handleResize)
        }
    }, [])

    // Helper: Dark Mode Color Adapter
    // If the saved stroke is black (default), and we are in dark mode, render it white.
    // And vice-versa, or keep it consistent? 
    // Usually, users want "default ink" to contrast with background.
    const getRenderColor = (color: string | undefined) => {
        if (!color) return theme === 'dark' ? '#ffffff' : '#000000' // default
        if (color === '#000000' && theme === 'dark') return '#ffffff'
        if (color === '#ffffff' && theme === 'dark') return '#000000' // rare but possible
        return color
    }

    // Helper: Fill Color
    const getRenderFill = (color: string | undefined) => {
        if (!color) return 'transparent'
        return color
    }

    // Helper: Text Contrast Logic
    const getContrastingTextColor = (fill: string | undefined) => {
        if (!fill || fill === 'transparent') {
            return theme === 'dark' ? '#ffffff' : '#000000'
        }
        let hex = fill.replace('#', '')
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
        if (hex.length !== 6) return theme === 'dark' ? '#ffffff' : '#000000'

        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
        return (yiq >= 128) ? '#000000' : '#ffffff'
    }

    // Save to Supabase
    useEffect(() => {
        if (elements.length === 0) return

        const saveToDb = async () => {
            setSaveStatus('saving')
            try {
                const { updateFlowchart } = await import("@/app/actions")
                // Sanitize elements
                const sanitizedElements = JSON.parse(JSON.stringify(elements))

                const result = await updateFlowchart(roomId, { content: sanitizedElements })

                if (result.error) {
                    console.error("Supabase Save Error:", result.error)
                }
            } catch (err) {
                console.error("Save failed:", err)
            } finally {
                setSaveStatus('saved')
            }
        }

        const timeoutId = setTimeout(saveToDb, 2000)
        return () => clearTimeout(timeoutId)
    }, [elements, roomId])

    useEffect(() => {
        const ydoc = new Y.Doc()
        ydocRef.current = ydoc
        const yArray = ydoc.getArray<FlowchartElement>("flowchart-elements")
        yElementsRef.current = yArray

        if (initialData && initialData.length > 0 && yArray.length === 0) {
            yArray.insert(0, initialData)
        }

        const provider = new HocuspocusProvider({
            url: process.env.NEXT_PUBLIC_COLLAB_SERVER_URL || 'ws://127.0.0.1:1234',
            name: `flowchart-${roomId}`,
            document: ydoc,
        })
        providerRef.current = provider

        yArray.observe(() => {
            setElements(yArray.toArray())
        })
        setElements(yArray.toArray())

        undoManagerRef.current = new Y.UndoManager(yArray)

        return () => {
            provider.destroy()
            ydoc.destroy()
        }
    }, [roomId, initialData])

    // Update Transformer
    useEffect(() => {
        if (selectedId && transformerRef.current && stageRef.current) {
            const node = stageRef.current.findOne('#' + selectedId)
            if (node) {
                transformerRef.current.nodes([node])
                transformerRef.current.getLayer().batchDraw()
            } else {
                transformerRef.current.nodes([])
            }
        } else if (transformerRef.current) {
            transformerRef.current.nodes([])
        }
    }, [selectedId, elements])

    const handleStageMouseDown = (e: any) => {
        const stage = e.target.getStage()
        const pos = stage.getPointerPosition()

        // Handle Arrow Creation (Drag start)
        if (activeTool === 'arrow') {
            const clickedId = e.target.id() || e.target.parent?.id()
            const clickedElement = elements.find(el => el.id === clickedId)

            if (clickedElement && clickedElement.type !== 'connection') {
                setDrawingArrow({
                    startId: clickedId,
                    endPos: pos
                })
                return
            }
        }
    }

    const handleStageMouseMove = (e: any) => {
        if (drawingArrow) {
            const stage = e.target.getStage()
            const pos = stage.getPointerPosition()

            let snapPos = pos
            let snappedTo = undefined

            // Find closest anchor on other nodes
            // Using a simple efficient loop
            let closestDist = 400 // 20px squared

            for (const el of elements) {
                if (el.id === drawingArrow.startId || el.type === 'connection' || el.type === 'text') continue

                const anchors = getAllAnchors(el)
                for (const anchor of anchors) {
                    const dist = Math.pow(anchor.x - pos.x, 2) + Math.pow(anchor.y - pos.y, 2)
                    if (dist < closestDist) {
                        closestDist = dist
                        snapPos = { x: anchor.x, y: anchor.y }
                        snappedTo = { nodeId: el.id, side: anchor.side }
                    }
                }
            }

            setDrawingArrow(prev => prev ? { ...prev, endPos: snapPos, snappedTo } : null)
        }
    }

    const handleStageMouseUp = (e: any) => {
        if (drawingArrow) {
            let targetId = null

            // Prefer snapped target
            if (drawingArrow.snappedTo) {
                targetId = drawingArrow.snappedTo.nodeId
            } else {
                // Fallback to what we are dropping on
                targetId = e.target.id() || e.target.parent?.id()
            }

            const targetElement = elements.find(el => el.id === targetId)

            if (targetElement && targetId !== drawingArrow.startId && targetElement.type !== 'connection') {
                // Create Connection
                const newConn: FlowchartElement = {
                    id: crypto.randomUUID(),
                    type: 'connection',
                    startId: drawingArrow.startId,
                    endId: targetId,
                    stroke: '#000000',
                    manualPosition: undefined
                }
                if (yElementsRef.current) {
                    yElementsRef.current.push([newConn])
                }
                setActiveTool('select')
            }
            setDrawingArrow(null)
        }
    }

    const handleStageClick = (e: any) => {
        // Close context menu if visible
        if (contextMenu.visible) {
            setContextMenu({ ...contextMenu, visible: false })
            return
        }

        // If drawing an arrow, click should not create a new shape or select
        if (activeTool === 'arrow') return

        const stage = e.target.getStage()
        const clickedOnEmpty = e.target === stage

        // Robustly find the clicked element's ID (Group ID)
        let clickedId = e.target.id()
        if (!clickedId) {
            const group = e.target.findAncestor('Group')
            if (group) {
                clickedId = group.id()
            }
        }

        // Handle Tool Creation
        if (activeTool !== 'select') {
            const pos = stage.getPointerPosition()

            // Standard Shape Creation
            const id = crypto.randomUUID()
            let newEl: FlowchartElement | null = null

            const defaultFill = '#ffffff'
            const defaultStroke = '#000000'

            if (activeTool === 'rectangle') {
                newEl = { id, type: 'rectangle', x: pos.x, y: pos.y, width: 100, height: 60, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'circle') {
                newEl = { id, type: 'circle', x: pos.x, y: pos.y, width: 60, height: 60, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'text') {
                newEl = { id, type: 'text', x: pos.x, y: pos.y, text: 'Click to edit', fill: defaultStroke }
            } else if (activeTool === 'diamond') {
                newEl = { id, type: 'diamond', x: pos.x, y: pos.y, width: 100, height: 100, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'rounded_rect') {
                newEl = { id, type: 'rounded_rect', x: pos.x, y: pos.y, width: 100, height: 60, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'parallelogram') {
                newEl = { id, type: 'parallelogram', x: pos.x, y: pos.y, width: 120, height: 60, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'cylinder') {
                newEl = { id, type: 'cylinder', x: pos.x, y: pos.y, width: 60, height: 80, fill: defaultFill, stroke: defaultStroke }
            }

            if (newEl && yElementsRef.current) {
                yElementsRef.current.push([newEl])
                setActiveTool('select')
                setSelectedId(id)
            }
            return
        }

        if (clickedOnEmpty) {
            setSelectedId(null)
        } else {
            if (clickedId) setSelectedId(clickedId)
        }
    }

    const handleElementDragEnd = (e: any, id: string) => {
        const idx = elements.findIndex(el => el.id === id)
        if (idx !== -1 && yElementsRef.current) {
            const newAttrs = {
                ...elements[idx],
                x: e.target.x(),
                y: e.target.y()
            }
            yElementsRef.current.delete(idx, 1)
            yElementsRef.current.insert(idx, [newAttrs])
        }
    }

    const handleTransformEnd = (e: any) => {
        if (!selectedId) return
        const idx = elements.findIndex(el => el.id === selectedId)
        if (idx !== -1 && yElementsRef.current) {
            const node = e.target
            const scaleX = node.scaleX()
            const scaleY = node.scaleY()

            // Reset scale to 1 so we can update the actual width/height
            node.scaleX(1)
            node.scaleY(1)

            const currentWidth = elements[idx].width || 100
            const currentHeight = elements[idx].height || 100

            const newAttrs = {
                ...elements[idx],
                x: node.x(),
                y: node.y(),
                // Use the element's previous dimensions * scale factor
                width: Math.max(5, currentWidth * scaleX),
                height: Math.max(5, currentHeight * scaleY),
                rotation: node.rotation()
            }

            yElementsRef.current.delete(idx, 1)
            yElementsRef.current.insert(idx, [newAttrs])
        }
    }

    // Helper for active tool styling
    const getToolClass = (tool: string) => {
        const isActive = activeTool === tool
        return `shrink-0 transition-all ${isActive
            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-100 ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-zinc-900'
            : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`
    }

    const handleContextMenu = (e: any, id: string) => {
        e.evt.preventDefault()
        const stage = e.target.getStage()
        // Use page coordinates for fixed menu (more reliable than stage pointer + container rect in some cases)
        // But stage pointer + container rect is standard for Konva.
        const containerRect = stage.container().getBoundingClientRect()
        const pointer = stage.getPointerPosition()

        if (pointer) {
            setContextMenu({
                visible: true,
                x: containerRect.left + pointer.x + 5,
                y: containerRect.top + pointer.y + 5,
                elementId: id
            })
        }
    }

    const handleDeleteElement = () => {
        if (contextMenu.elementId && yElementsRef.current) {
            const idx = elements.findIndex(el => el.id === contextMenu.elementId)
            if (idx !== -1) {
                yElementsRef.current.delete(idx, 1)
                if (selectedId === contextMenu.elementId) setSelectedId(null)
            }
        }
        setContextMenu({ ...contextMenu, visible: false })
    }

    const handleInsertText = () => {
        if (contextMenu.elementId) {
            const el = elements.find(e => e.id === contextMenu.elementId)
            if (el) {
                setTextInput(el.text || "")
                setIsTextDialogOpen(true)
            }
        }
        setContextMenu({ ...contextMenu, visible: false })
    }

    const saveText = () => {
        if (contextMenu.elementId && yElementsRef.current) {
            const idx = elements.findIndex(el => el.id === contextMenu.elementId)
            if (idx !== -1) {
                const newAttrs = { ...elements[idx], text: textInput }
                yElementsRef.current.delete(idx, 1)
                yElementsRef.current.insert(idx, [newAttrs])
            }
        }
        setIsTextDialogOpen(false)
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-zinc-950 relative transition-colors duration-200">
            {/* Toolbar */}
            <div className="flex items-center p-4 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 gap-2 overflow-x-auto shadow-sm z-10">
                <Button variant="ghost" size="icon" onClick={() => setActiveTool('select')} title="Select" className={getToolClass('select')}><MousePointer2 className="w-4 h-4" /></Button>
                <div className="w-px h-6 bg-slate-200 dark:bg-zinc-700 mx-1 shrink-0" />
                <Button variant="ghost" size="icon" onClick={() => setActiveTool('rectangle')} title="Rectangle" className={getToolClass('rectangle')}><Square className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setActiveTool('rounded_rect')} title="Rounded Rectangle" className={getToolClass('rounded_rect')}><RectangleHorizontal className="w-4 h-4 rounded-xl" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setActiveTool('circle')} title="Ellipse" className={getToolClass('circle')}><CircleIcon className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setActiveTool('diamond')} title="Decision" className={getToolClass('diamond')}><Diamond className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setActiveTool('parallelogram')} title="Data" className={getToolClass('parallelogram')}><Component className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setActiveTool('cylinder')} title="Database" className={getToolClass('cylinder')}><Database className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setActiveTool('arrow')} title="Arrow" className={getToolClass('arrow')}><ArrowRight className="w-4 h-4" /></Button>
                <div className="w-px h-6 bg-slate-200 dark:bg-zinc-700 mx-1 shrink-0" />
                <Button variant="ghost" size="icon" onClick={() => setActiveTool('text')} title="Text" className={getToolClass('text')}><Type className="w-4 h-4" /></Button>

                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400 ml-4">
                    {saveStatus === 'saving' ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="hidden md:inline">Saving</span>
                        </>
                    ) : (
                        <>
                            <Cloud className="w-4 h-4" />
                            <span className="hidden md:inline">Saved</span>
                        </>
                    )}
                </div>

                <div className="ml-auto flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => undoManagerRef.current?.undo()} className="dark:text-zinc-300 dark:hover:bg-zinc-800"><Undo className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => undoManagerRef.current?.redo()} className="dark:text-zinc-300 dark:hover:bg-zinc-800"><Redo className="w-4 h-4" /></Button>
                </div>
            </div>

            <div className="flex-1 relative w-full bg-white dark:bg-zinc-950 overflow-hidden">
                {/* Dot Grid Background */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-20"
                    style={{
                        backgroundImage: theme === 'dark'
                            ? 'radial-gradient(circle, #ffffff 1.5px, transparent 1.5px)'
                            : 'radial-gradient(circle, #000000 1.5px, transparent 1.5px)',
                        backgroundSize: '20px 20px',
                    }}
                />
                <Stage
                    width={windowSize.width}
                    height={windowSize.height}
                    onMouseDown={handleStageMouseDown}
                    onMouseMove={handleStageMouseMove}
                    onMouseUp={handleStageMouseUp}
                    onClick={handleStageClick}
                    onContextMenu={(e) => { e.evt.preventDefault(); }}
                    ref={stageRef}
                    className="cursor-crosshair active:cursor-grabbing"
                    style={{ background: 'transparent' }}
                >
                    <Layer>
                        {elements.map((el) => {
                            if (!el.type) return null

                            // Common props for interactivity
                            const isSelected = selectedId === el.id
                            const commonProps = {
                                id: el.id,
                                draggable: activeTool === 'select' && editingId !== el.id,
                                onClick: (e: any) => { e.cancelBubble = true; setSelectedId(el.id); },
                                onDblClick: (e: any) => {
                                    e.cancelBubble = true;
                                    if (activeTool === 'select' && el.type !== 'connection') {
                                        setEditingId(el.id);
                                        setTextInput(el.text || "");
                                    }
                                },
                                onDragEnd: (e: any) => handleElementDragEnd(e, el.id),
                                onTransformEnd: handleTransformEnd,
                                onContextMenu: (e: any) => handleContextMenu(e, el.id),
                                strokeWidth: 2,
                                shadowColor: 'cyan',
                                shadowBlur: (isSelected && theme === 'dark') ? 0 : (isSelected ? 10 : 0),
                                shadowOpacity: 0.6,
                                strokeScaleEnabled: false
                            }
                            // Theme-aware colors
                            const stroke = getRenderColor(el.stroke)
                            const fill = el.fill ? getRenderFill(el.fill) : (theme === 'dark' ? 'transparent' : '#ffffff')

                            // Determine Text Color
                            let textColor = '#000000'
                            if (el.type === 'text') {
                                textColor = getRenderColor(el.fill || '#000000')
                            } else {
                                textColor = getContrastingTextColor(fill)
                            }

                            const renderText = () => (
                                el.text && editingId !== el.id ? <KonvaText
                                    text={el.text}
                                    x={0}
                                    y={0}
                                    width={el.width}
                                    height={el.height}
                                    align="center"
                                    verticalAlign="middle"
                                    fill={textColor}
                                    listening={false}
                                /> : null
                            )

                            if (el.type === 'rectangle') {
                                return (
                                    <Group key={el.id} {...commonProps} x={el.x} y={el.y}>
                                        <Rect width={el.width} height={el.height} fill={fill} stroke={stroke} cornerRadius={2} />
                                        {renderText()}
                                    </Group>
                                )
                            } else if (el.type === 'circle') {
                                return (
                                    <Group key={el.id} {...commonProps} x={el.x} y={el.y}>
                                        <Circle radius={Math.min((el.width || 50) / 2, (el.height || 50) / 2)} offsetX={-((el.width || 0) / 2)} offsetY={-((el.height || 0) / 2)} fill={fill} stroke={stroke} />
                                        {renderText()}
                                    </Group>
                                )
                            } else if (el.type === 'rounded_rect') {
                                return (
                                    <Group key={el.id} {...commonProps} x={el.x} y={el.y}>
                                        <Rect width={el.width} height={el.height} fill={fill} stroke={stroke} cornerRadius={10} />
                                        {renderText()}
                                    </Group>
                                )
                            } else if (el.type === 'diamond') {
                                return (
                                    <Group key={el.id} {...commonProps} x={el.x} y={el.y}>
                                        <RegularPolygon sides={4} radius={Math.min((el.width || 50) / 2, (el.height || 50) / 2)} offsetX={-((el.width || 0) / 2)} offsetY={-((el.height || 0) / 2)} fill={fill} stroke={stroke} />
                                        {renderText()}
                                    </Group>
                                )
                            } else if (el.type === 'parallelogram') {
                                return (
                                    <Group key={el.id} {...commonProps} x={el.x} y={el.y}>
                                        <Path data={`M 0 ${el.height || 50} L ${el.width || 100} ${el.height || 50} L ${(el.width || 100) * 0.8} 0 L ${(el.width || 100) * 0.2} 0 Z`} fill={fill} stroke={stroke} />
                                        {renderText()}
                                    </Group>
                                )
                            } else if (el.type === 'cylinder') {
                                const w = el.width || 60
                                const h = el.height || 80
                                const ry = w / 4
                                return (
                                    <Group key={el.id} {...commonProps} x={el.x} y={el.y}>
                                        <Path data={`M 0 ${ry} L 0 ${h - ry} A ${w / 2} ${ry} 0 0 0 ${w} ${h - ry} L ${w} ${ry} A ${w / 2} ${ry} 0 0 1 0 ${ry} Z`} fill={fill} stroke={stroke} />
                                        <Circle x={w / 2} y={ry} radiusX={w / 2} radiusY={ry} fill={fill} stroke={stroke} />
                                        {renderText()}
                                    </Group>
                                )
                            } else if (el.type === 'connection' && el.startId && el.endId) {
                                const startNode = elements.find(e => e.id === el.startId)
                                const endNode = elements.find(e => e.id === el.endId)

                                if (startNode && endNode) {
                                    const { points, handlePos, isVerticalSegment } = getOrthogonalPoints(startNode, endNode, el.manualPosition)

                                    return (
                                        <Group key={el.id}>
                                            <Arrow
                                                points={points}
                                                stroke={theme === 'dark' ? '#ffffff' : '#000000'}
                                                fill={theme === 'dark' ? '#ffffff' : '#000000'}
                                                strokeWidth={2}
                                                pointerLength={10}
                                                pointerWidth={10}
                                                cornerRadius={5}
                                                onClick={(e) => {
                                                    e.cancelBubble = true;
                                                    setSelectedId(el.id);
                                                }}
                                                onContextMenu={(e) => handleContextMenu(e, el.id)}
                                                hitStrokeWidth={20}
                                            />
                                            {selectedId === el.id && (
                                                <Circle
                                                    x={handlePos.x}
                                                    y={handlePos.y}
                                                    radius={5}
                                                    fill="#3b82f6"
                                                    draggable
                                                    dragBoundFunc={(pos) => {
                                                        if (isVerticalSegment) {
                                                            return { x: pos.x, y: handlePos.y }
                                                        } else {
                                                            return { x: handlePos.x, y: pos.y }
                                                        }
                                                    }}
                                                    onDragEnd={(e) => {
                                                        const node = e.target
                                                        const newPos = isVerticalSegment ? node.x() : node.y()
                                                        const idx = elements.findIndex(x => x.id === el.id)
                                                        if (idx !== -1 && yElementsRef.current) {
                                                            const newAttrs = { ...elements[idx], manualPosition: newPos }
                                                            yElementsRef.current.delete(idx, 1)
                                                            yElementsRef.current.insert(idx, [newAttrs])
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Group>
                                    )
                                }
                                return null
                            } else if (el.type === 'arrow') {
                                return (
                                    <Group key={el.id} {...commonProps} x={el.x} y={el.y}>
                                        <Arrow
                                            points={[0, (el.height || 20) / 2, el.width || 100, (el.height || 20) / 2]}
                                            pointerLength={10}
                                            pointerWidth={10}
                                            fill={stroke}
                                            stroke={stroke}
                                            strokeWidth={2}
                                            shadowBlur={theme === 'dark' ? 0 : 2}
                                        />
                                        {/* Simple Arrow text always visible for now, or editable? */}
                                        <KonvaText
                                            text={el.text}
                                            x={0}
                                            y={0}
                                            width={el.width}
                                            height={el.height}
                                            align="center"
                                            verticalAlign="middle"
                                            fill={textColor}
                                            listening={false}
                                        />
                                    </Group>
                                )
                            }
                            else if (el.type === 'text') {
                                return editingId !== el.id ? <KonvaText
                                    key={el.id}
                                    {...commonProps}
                                    x={el.x}
                                    y={el.y}
                                    text={el.text || "Text"}
                                    fill={textColor}
                                    fontSize={20}
                                /> : null
                            }
                            return null
                        })}

                        {/* Anchor Indicators during Drag */}
                        {drawingArrow && elements.map((el) => {
                            if (el.id === drawingArrow.startId || el.type === 'connection' || el.type === 'text') return null
                            const anchors = getAllAnchors(el)
                            return (
                                <Group key={`anchors-${el.id}`}>
                                    {anchors.map((a, i) => {
                                        const isSnapped = drawingArrow.snappedTo?.nodeId === el.id && drawingArrow.snappedTo?.side === a.side
                                        return (
                                            <Circle
                                                key={i}
                                                x={a.x} y={a.y}
                                                radius={isSnapped ? 6 : 4}
                                                fill={isSnapped ? '#3b82f6' : theme === 'dark' ? '#ffffff' : '#000000'}
                                                stroke={isSnapped ? '#3b82f6' : theme === 'dark' ? '#ffffff' : '#000000'}
                                                strokeWidth={isSnapped ? 0 : 1}
                                                opacity={isSnapped ? 1 : 0.5}
                                                shadowBlur={isSnapped ? 10 : 0}
                                                shadowColor="#3b82f6"
                                                listening={false}
                                            />
                                        )
                                    })}
                                </Group>
                            )
                        })}

                        {/* Temp Arrow Rendering during Drag */}
                        {drawingArrow && (() => {
                            const startNode = elements.find(e => e.id === drawingArrow.startId)
                            if (!startNode) return null
                            const startAnchor = getAnchorPoint(startNode, drawingArrow.endPos)
                            return (
                                <Arrow
                                    points={[startAnchor.x, startAnchor.y, drawingArrow.endPos.x, drawingArrow.endPos.y]}
                                    stroke={theme === 'dark' ? '#ffffff' : '#000000'}
                                    strokeWidth={2}
                                    dash={[5, 5]}
                                    pointerLength={10}
                                    pointerWidth={10}
                                />
                            )
                        })()}

                        <Transformer ref={transformerRef} />
                    </Layer>
                </Stage>

                {/* Inline Editing Overlay */}
                {editingId && (() => {
                    const el = elements.find(e => e.id === editingId)
                    if (!el) return null

                    const isShape = el.type !== 'text' && el.type !== 'connection' && el.type !== 'arrow'
                    const w = el.width || (el.type === 'text' ? 200 : 100)
                    const h = el.height || (el.type === 'text' ? 40 : 60)
                    const bgFill = el.fill ? getRenderFill(el.fill) : (theme === 'dark' ? 'transparent' : '#ffffff')

                    // Approximate centering for textarea padding if it's a shape
                    const paddingTop = isShape ? Math.max(0, (h / 2) - 10) : 0

                    return (
                        <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            onBlur={() => {
                                if (yElementsRef.current) {
                                    const idx = elements.findIndex(e => e.id === editingId)
                                    if (idx !== -1) {
                                        const newAttrs = { ...elements[idx], text: textInput }
                                        yElementsRef.current.delete(idx, 1)
                                        yElementsRef.current.insert(idx, [newAttrs])
                                    }
                                }
                                setEditingId(null)
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    e.currentTarget.blur()
                                }
                            }}
                            autoFocus
                            style={{
                                position: 'absolute',
                                top: el.y,
                                left: el.x,
                                width: w,
                                height: h,
                                color: isShape ? getContrastingTextColor(bgFill) : (theme === 'dark' ? '#fff' : '#000'),
                                background: 'transparent',
                                border: '1px dashed #3b82f6',
                                textAlign: 'center',
                                resize: 'none',
                                outline: 'none',
                                paddingTop: `${paddingTop}px`,
                                fontSize: '14px',
                                fontFamily: 'sans-serif',
                                lineHeight: '1.2'
                            }}
                            className="z-50 bg-transparent focus:ring-0"
                        />
                    )
                })()}
                {/* Context Menu HTML Overlay */}
                {contextMenu.visible && (
                    <div
                        className="fixed bg-white dark:bg-zinc-800 border dark:border-zinc-700 shadow-lg rounded-md py-1 z-50 text-sm min-w-[150px] animate-in fade-in zoom-in-95"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <button
                            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-zinc-700 dark:text-zinc-200 flex items-center gap-2"
                            onClick={handleInsertText}
                        >
                            <Pencil className="w-4 h-4" /> Insert Text
                        </button>
                        <button
                            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 flex items-center gap-2"
                            onClick={handleDeleteElement}
                        >
                            <Trash2 className="w-4 h-4" /> Delete Component
                        </button>
                    </div>
                )}
            </div>

            <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Text</DialogTitle>
                        <DialogDescription>Enter text for this component.</DialogDescription>
                    </DialogHeader>
                    <Input value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Type here..." />
                    <DialogFooter>
                        <Button onClick={saveText}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}
