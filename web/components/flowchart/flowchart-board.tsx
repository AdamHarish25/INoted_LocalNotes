"use client"

import React, { useEffect, useRef, useState } from "react"
import { Stage, Layer, Rect, Circle, Text as KonvaText, Line, Transformer, RegularPolygon, Path, Group, Arrow } from "react-konva"
import { HocuspocusProvider } from "@hocuspocus/provider"
import * as Y from "yjs"
import { Button } from "@/components/ui/button"
import { Square, Circle as CircleIcon, Type, MousePointer2, Save, Undo, Redo, Phone, Database, Hexagon, Component, RectangleHorizontal, Diamond, Trash2, Pencil, RefreshCw, ArrowRight, Hand, ZoomIn, ZoomOut, Move, Minus, MoreHorizontal, Dot, ChevronRight, Hash, Triangle, FileText, Cloud as CloudIcon, MonitorOff, Download, Image as ImageIcon } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Loader2, Cloud } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"

interface FlowchartElement {
    id: string
    type: 'rectangle' | 'circle' | 'text' | 'arrow' | 'diamond' | 'cylinder' | 'parallelogram' | 'rounded_rect' | 'connection' | 'triangle' | 'hexagon' | 'trapezoid' | 'document' | 'cloud'
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
    lineType?: 'solid' | 'dashed' | 'dotted' | 'curved'
    arrowType?: 'sharp' | 'standard' | 'none' | 'diamond'
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
    const [activeTool, setActiveTool] = useState<'select' | 'hand' | 'rectangle' | 'circle' | 'text' | 'arrow' | 'diamond' | 'cylinder' | 'parallelogram' | 'rounded_rect' | 'triangle' | 'hexagon' | 'trapezoid' | 'document' | 'cloud'>('select')

    // Viewport State
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
    const [stageScale, setStageScale] = useState(1)
    const [isSpacePressed, setIsSpacePressed] = useState(false)

    // Drag-to-connect state
    const [drawingArrow, setDrawingArrow] = useState<{ startId: string, endPos: { x: number, y: number }, snappedTo?: { nodeId: string, side: string } } | null>(null)

    // Window Size State to prevent hydration mismatch
    const [windowSize, setWindowSize] = useState({ width: 1000, height: 800 })
    const { theme } = useTheme()

    // Mobile Detection
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

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

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !editingId) {
                // Prevent scrolling page when pressing space
                // e.preventDefault() // Might block other native things? Use carefully.
                // Actually, only preventing if we are focusing the body, otherwise text inputs need space.
                if (document.activeElement === document.body) {
                    e.preventDefault()
                    setIsSpacePressed(true)
                }
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
                e.preventDefault()
                handleZoom(1.1)
            }
            if ((e.ctrlKey || e.metaKey) && e.key === '-') {
                e.preventDefault()
                handleZoom(0.9) // 1/1.1 approx 0.9
            }
            if ((e.ctrlKey || e.metaKey) && e.key === '0') {
                e.preventDefault()
                setStageScale(1)
                setStagePos({ x: 0, y: 0 })
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [editingId, stageScale]) // Depend on stageScale for zoom handler closure if needed (or use functional update)

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

    const handleZoom = (factor: number, center?: { x: number, y: number }) => {
        setStageScale(oldScale => {
            const newScale = oldScale * factor
            // Clamp zoom
            if (newScale < 0.1 || newScale > 5) return oldScale

            // If center provided, zoom towards it (mouse position)
            // Logic handled in wheel event usually, but for buttons we zoom center screen
            if (!center && stageRef.current) {
                // Center of viewport
                const stage = stageRef.current
                const viewCenter = {
                    x: stage.width() / 2,
                    y: stage.height() / 2
                }
                const oldPos = stage.position()
                const mousePointTo = {
                    x: (viewCenter.x - oldPos.x) / oldScale,
                    y: (viewCenter.y - oldPos.y) / oldScale,
                }

                const newPos = {
                    x: viewCenter.x - mousePointTo.x * newScale,
                    y: viewCenter.y - mousePointTo.y * newScale,
                }
                setStagePos(newPos)
            }

            return newScale
        })
    }

    const handleWheel = (e: any) => {
        e.evt.preventDefault()
        const stage = stageRef.current
        if (!stage) return

        // 1. Zoom (Ctrl + Wheel)
        if (e.evt.ctrlKey || e.evt.metaKey) {
            const oldScale = stage.scaleX()
            const pointer = stage.getPointerPosition()

            const mousePointTo = {
                x: (pointer.x - stage.x()) / oldScale,
                y: (pointer.y - stage.y()) / oldScale,
            }

            // Normal scroll is usually 100 per tick. Normalize direction.
            // e.evt.deltaY > 0 -> Scroll Down -> Zoom Out
            const direction = e.evt.deltaY > 0 ? -1 : 1
            const scaleBy = 1.1
            const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy

            // Limit bounds
            if (newScale < 0.1 || newScale > 10) return

            setStageScale(newScale)

            const newPos = {
                x: pointer.x - mousePointTo.x * newScale,
                y: pointer.y - mousePointTo.y * newScale,
            }
            setStagePos(newPos)
        } else {
            // 2. Panning (Touchpad scroll or Shift+Scroll)
            // On trackpad, deltaX and deltaY act as panning
            const dx = -e.evt.deltaX
            const dy = -e.evt.deltaY

            setStagePos(prev => ({
                x: prev.x + dx,
                y: prev.y + dy
            }))
        }
    }

    const handleStageMouseDown = (e: any) => {
        // If Spacebar is pressed, we are dragging the stage, bubbling is fine (konva handles drag)
        // If Hand Tool is active, same.

        const stage = e.target.getStage()
        const pos = stage.getPointerPosition() // This is relative to stage top-left, adjusted by transform?
        // Actually getPointerPosition gives {x, y} coordinate relative to the container (screen pixels on canvas), 
        // regardless of scale/pos, but mapped? No, wait. 
        // getPointerPosition returns the position on the STAGE content, i.e., after inverse transform?
        // Docs: "Returns pointer position relative to the stage container" -> Screen pixels relative to top-left of canvas DOM.

        // We need "Scene Coordinates" (world) for creating elements:
        // transform: (screen - stagePos) / scale
        const transformToScene = (screen: { x: number, y: number }) => {
            return {
                x: (screen.x - stagePos.x) / stageScale,
                y: (screen.y - stagePos.y) / stageScale
            }
        }

        const scenePos = pos ? transformToScene(pos) : { x: 0, y: 0 }

        // Handle Arrow Creation (Drag start)
        if (activeTool === 'arrow') {
            const clickedId = e.target.id() || e.target.parent?.id()
            const clickedElement = elements.find(el => el.id === clickedId)

            if (clickedElement && clickedElement.type !== 'connection') {
                setDrawingArrow({
                    startId: clickedId,
                    endPos: scenePos
                })
                return
            }
        }
    }

    const handleStageMouseMove = (e: any) => {
        const stage = e.target.getStage() // Can be undefined during rapid unmount
        if (!stage) return

        const pos = stage.getPointerPosition()
        if (!pos) return

        const transformToScene = (screen: { x: number, y: number }) => {
            return {
                x: (screen.x - stagePos.x) / stageScale,
                y: (screen.y - stagePos.y) / stageScale
            }
        }
        const scenePos = transformToScene(pos)

        if (drawingArrow) {
            let snapPos = scenePos
            let snappedTo = undefined

            // Find closest anchor on other nodes
            // Using a simple efficient loop
            let closestDist = 400 // 20px squared

            for (const el of elements) {
                if (el.id === drawingArrow.startId || el.type === 'connection' || el.type === 'text') continue

                const anchors = getAllAnchors(el)
                for (const anchor of anchors) {
                    const dist = Math.pow(anchor.x - scenePos.x, 2) + Math.pow(anchor.y - scenePos.y, 2)
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
        // Handle Tool Creation
        if (activeTool !== 'select' && activeTool !== 'hand') {
            const pos = stage.getPointerPosition()
            if (!pos) return

            const transformToScene = (screen: { x: number, y: number }) => {
                return {
                    x: (screen.x - stagePos.x) / stageScale,
                    y: (screen.y - stagePos.y) / stageScale
                }
            }
            const scenePos = transformToScene(pos)

            // Standard Shape Creation
            const id = crypto.randomUUID()
            let newEl: FlowchartElement | null = null

            const defaultFill = '#ffffff'
            const defaultStroke = '#000000'

            if (activeTool === 'rectangle') {
                newEl = { id, type: 'rectangle', x: scenePos.x, y: scenePos.y, width: 100, height: 60, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'circle') {
                newEl = { id, type: 'circle', x: scenePos.x, y: scenePos.y, width: 60, height: 60, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'text') {
                newEl = { id, type: 'text', x: scenePos.x, y: scenePos.y, text: 'Click to edit', fill: defaultStroke }
            } else if (activeTool === 'diamond') {
                newEl = { id, type: 'diamond', x: scenePos.x, y: scenePos.y, width: 100, height: 100, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'rounded_rect') {
                newEl = { id, type: 'rounded_rect', x: scenePos.x, y: scenePos.y, width: 100, height: 60, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'parallelogram') {
                newEl = { id, type: 'parallelogram', x: scenePos.x, y: scenePos.y, width: 120, height: 60, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'cylinder') {
                newEl = { id, type: 'cylinder', x: scenePos.x, y: scenePos.y, width: 60, height: 80, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'triangle') {
                newEl = { id, type: 'triangle', x: scenePos.x, y: scenePos.y, width: 80, height: 80, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'hexagon') {
                newEl = { id, type: 'hexagon', x: scenePos.x, y: scenePos.y, width: 100, height: 80, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'trapezoid') {
                newEl = { id, type: 'trapezoid', x: scenePos.x, y: scenePos.y, width: 100, height: 60, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'document') {
                newEl = { id, type: 'document', x: scenePos.x, y: scenePos.y, width: 80, height: 100, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'cloud') {
                newEl = { id, type: 'cloud', x: scenePos.x, y: scenePos.y, width: 100, height: 80, fill: defaultFill, stroke: defaultStroke }
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

    const handleExport = (format: 'png' | 'jpg' | 'svg') => {
        if (!stageRef.current || elements.length === 0) return

        // Calculate bounding box of all elements
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        elements.forEach(el => {
            const x = el.x || 0
            const y = el.y || 0
            const w = el.width || 0
            const h = el.height || 0

            // For standard shapes
            if (el.type !== 'connection') {
                minX = Math.min(minX, x)
                minY = Math.min(minY, y)
                maxX = Math.max(maxX, x + w)
                maxY = Math.max(maxY, y + h)
            }

            // Check line points for connection
            if (el.type === 'connection') {
                // Connections might not have x/y set correctly if points are used absolute
                // But our orthgonal points are absolute coords
                // We need to fetch points. If we can't easily get calculated points here without 'getOrthogonalPoints' re-run...
                // We can re-run it.
                if (el.startId && el.endId) {
                    const startNode = elements.find(e => e.id === el.startId)
                    const endNode = elements.find(e => e.id === el.endId)
                    if (startNode && endNode) {
                        const { points } = getOrthogonalPoints(startNode, endNode, el.manualPosition)
                        for (let i = 0; i < points.length; i += 2) {
                            minX = Math.min(minX, points[i])
                            maxX = Math.max(maxX, points[i])
                            minY = Math.min(minY, points[i + 1])
                            maxY = Math.max(maxY, points[i + 1])
                        }
                    }
                }
            }
        })

        // Add padding
        const PADDING = 50
        if (minX === Infinity) { minX = 0; maxX = 100; minY = 0; maxY = 100; }

        minX -= PADDING
        minY -= PADDING
        maxX += PADDING
        maxY += PADDING

        const width = maxX - minX
        const height = maxY - minY

        if (format === 'svg') {
            let svgContent = `<svg width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`
            // Background
            svgContent += `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${theme === 'dark' ? '#000000' : '#ffffff'}"/>`

            elements.forEach(el => {
                const stroke = getRenderColor(el.stroke)
                const fill = el.fill ? getRenderFill(el.fill) : (theme === 'dark' ? 'transparent' : '#ffffff')
                const elX = el.x || 0
                const elY = el.y || 0
                const w = el.width || 100
                const h = el.height || 100

                // Text Helper
                const addText = () => {
                    if (el.text) {
                        const textColor = el.type === 'text' ? getRenderColor(el.fill) : getContrastingTextColor(fill)
                        // Simple approximation for text centering
                        const cx = elX + w / 2
                        const cy = elY + h / 2 + 5 // nudge
                        const escaped = el.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                        // Using SVG text with middle anchor
                        svgContent += `<text x="${cx}" y="${cy}" fill="${textColor}" font-family="sans-serif" font-size="20" text-anchor="middle" dominant-baseline="middle">${escaped}</text>`
                    }
                }

                if (el.type === 'rectangle') {
                    svgContent += `<rect x="${elX}" y="${elY}" width="${w}" height="${h}" stroke="${stroke}" stroke-width="2" fill="${fill}" rx="2"/>`
                    addText()
                } else if (el.type === 'rounded_rect') {
                    svgContent += `<rect x="${elX}" y="${elY}" width="${w}" height="${h}" stroke="${stroke}" stroke-width="2" fill="${fill}" rx="10"/>`
                    addText()
                } else if (el.type === 'circle') {
                    svgContent += `<ellipse cx="${elX + w / 2}" cy="${elY + h / 2}" rx="${w / 2}" ry="${h / 2}" stroke="${stroke}" stroke-width="2" fill="${fill}"/>`
                    addText()
                } else if (el.type === 'diamond') {
                    const pts = `${elX + w / 2},${elY} ${elX + w},${elY + h / 2} ${elX + w / 2},${elY + h} ${elX},${elY + h / 2}`
                    svgContent += `<polygon points="${pts}" stroke="${stroke}" stroke-width="2" fill="${fill}"/>`
                    addText()
                } else if (el.type === 'parallelogram') {
                    // data={`M 0 ${el.height || 50} L ${el.width || 100} ${el.height || 50} L ${(el.width || 100) * 0.8} 0 L ${(el.width || 100) * 0.2} 0 Z`}
                    // Need to translate path to elX, elY
                    const path = `M ${elX} ${elY + h} L ${elX + w} ${elY + h} L ${elX + w * 0.8} ${elY} L ${elX + w * 0.2} ${elY} Z`
                    svgContent += `<path d="${path}" stroke="${stroke}" stroke-width="2" fill="${fill}"/>`
                    addText()
                } else if (el.type === 'cylinder') {
                    const ry = w / 4
                    // Path data logic from render
                    // M 0 ${ry} L 0 ${h - ry} A ${w / 2} ${ry} 0 0 0 ${w} ${h - ry} L ${w} ${ry} A ${w / 2} ${ry} 0 0 1 0 ${ry} Z
                    // SVG Path A command: rx ry x-axis-rotation large-arc-flag sweep-flag x y
                    // Translated:
                    const d = `M ${elX} ${elY + ry} L ${elX} ${elY + h - ry} A ${w / 2} ${ry} 0 0 0 ${elX + w} ${elY + h - ry} L ${elX + w} ${elY + ry} A ${w / 2} ${ry} 0 0 1 ${elX} ${elY + ry} Z`
                    // Top circle
                    svgContent += `<path d="${d}" stroke="${stroke}" stroke-width="2" fill="${fill}"/>`
                    svgContent += `<ellipse cx="${elX + w / 2}" cy="${elY + ry}" rx="${w / 2}" ry="${ry}" stroke="${stroke}" stroke-width="2" fill="${fill}"/>`
                    addText()
                } else if (el.type === 'triangle') {
                    // RegularPolygon 3 sides. Center at elX + w/2, elY + h/2
                    // Approximating with path M top-mid L bottom-right L bottom-left Z
                    const d = `M ${elX + w / 2} ${elY} L ${elX + w} ${elY + h} L ${elX} ${elY + h} Z`
                    svgContent += `<path d="${d}" stroke="${stroke}" stroke-width="2" fill="${fill}"/>`
                    addText()
                } else if (el.type === 'connection' && el.startId && el.endId) {
                    const startNode = elements.find(e => e.id === el.startId)
                    const endNode = elements.find(e => e.id === el.endId)
                    if (startNode && endNode) {
                        const res = getOrthogonalPoints(startNode, endNode, el.manualPosition)
                        const pts = res.points
                        let d = `M ${pts[0]} ${pts[1]}`
                        for (let i = 2; i < pts.length; i += 2) {
                            d += ` L ${pts[i]} ${pts[i + 1]}`
                        }
                        svgContent += `<path d="${d}" stroke="${stroke}" stroke-width="2" fill="none" stroke-linejoin="round"/>`
                        // Handle simple arrow head at end
                        const lastX = pts[pts.length - 2]
                        const lastY = pts[pts.length - 1]
                        const prevX = pts[pts.length - 4]
                        const prevY = pts[pts.length - 3]
                        const angle = Math.atan2(lastY - prevY, lastX - prevX)
                        const headLen = 10
                        if (el.arrowType !== 'none') {
                            const x1 = lastX - headLen * Math.cos(angle - Math.PI / 6)
                            const y1 = lastY - headLen * Math.sin(angle - Math.PI / 6)
                            const x2 = lastX - headLen * Math.cos(angle + Math.PI / 6)
                            const y2 = lastY - headLen * Math.sin(angle + Math.PI / 6)
                            svgContent += `<path d="M ${lastX} ${lastY} L ${x1} ${y1} M ${lastX} ${lastY} L ${x2} ${y2}" stroke="${stroke}" stroke-width="2" fill="none"/>`
                        }
                    }
                } else if (el.type === 'text') {
                    const escaped = (el.text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                    const textColor = getRenderColor(el.fill)
                    svgContent += `<text x="${elX}" y="${elY + 20}" fill="${textColor}" font-family="sans-serif" font-size="20">${escaped}</text>`
                }

                // Add more shapes as needed (trapezoid, hexagon, etc) strictly if requested or fallback to simple rect
                // Hexagon
                else if (el.type === 'hexagon') {
                    // 6 sides
                    const d = `M ${elX + w * 0.2} ${elY} L ${elX + w * 0.8} ${elY} L ${elX + w} ${elY + h / 2} L ${elX + w * 0.8} ${elY + h} L ${elX + w * 0.2} ${elY + h} L ${elX} ${elY + h / 2} Z`
                    svgContent += `<path d="${d}" stroke="${stroke}" stroke-width="2" fill="${fill}"/>`
                    addText()
                }
            })

            svgContent += `</svg>`
            const blob = new Blob([svgContent], { type: 'image/svg+xml' })
            const link = document.createElement('a')
            link.download = `flowchart-${roomId}.svg`
            link.href = URL.createObjectURL(blob)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

        } else {
            const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'
            // Konva toDataURL handles the viewport crop/scale
            const dataUrl = stageRef.current.toDataURL({
                x: minX,
                y: minY,
                width: width,
                height: height,
                pixelRatio: 2,
                mimeType,
                quality: 0.9 // for jpg
            })

            const link = document.createElement('a')
            link.download = `flowchart-${roomId}.${format}`
            link.href = dataUrl
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
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
        <div className="relative h-screen w-full bg-slate-50 dark:bg-zinc-950 overflow-hidden">
            {isMobile && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4 text-center">
                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 max-w-md w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                            <MonitorOff className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-zinc-100">
                            Device Not Supported
                        </h2>
                        <p className="text-slate-600 dark:text-zinc-400 mb-8">
                            This page is only for tablets or desktops. Please access this page from a larger screen to edit flowcharts.
                        </p>
                        <Button asChild className="w-full">
                            <Link href="..">Back to Dashboard</Link>
                        </Button>
                    </div>
                </div>
            )}

            <div className={`flex flex-col h-full w-full transition-colors duration-200 ${isMobile ? 'invisible pointer-events-none absolute inset-0' : ''}`}>
                {/* Toolbar */}
                <div className="flex items-center p-4 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 gap-2 overflow-x-auto shadow-sm z-10">
                    <Button variant="ghost" size="icon" onClick={() => setActiveTool('select')} title="Select" className={getToolClass('select')}><MousePointer2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setActiveTool('hand')} title="Hand (Pan) [Space]" className={getToolClass('hand')}><Hand className="w-4 h-4" /></Button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-zinc-700 mx-1 shrink-0" />
                    <Button variant="ghost" size="icon" onClick={() => setActiveTool('rectangle')} title="Rectangle" className={getToolClass('rectangle')}><Square className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setActiveTool('rounded_rect')} title="Rounded Rectangle" className={getToolClass('rounded_rect')}><RectangleHorizontal className="w-4 h-4 rounded-xl" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setActiveTool('circle')} title="Ellipse" className={getToolClass('circle')}><CircleIcon className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setActiveTool('diamond')} title="Decision" className={getToolClass('diamond')}><Diamond className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setActiveTool('parallelogram')} title="Data" className={getToolClass('parallelogram')}><Component className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setActiveTool('cylinder')} title="Database" className={getToolClass('cylinder')}><Database className="w-4 h-4" /></Button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-zinc-700 mx-1 shrink-0" />
                    <Button variant="ghost" size="icon" onClick={() => setActiveTool('triangle')} title="Triangle (Merge)" className={getToolClass('triangle')}><Triangle className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setActiveTool('hexagon')} title="Hexagon (Preparation)" className={getToolClass('hexagon')}><Hexagon className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setActiveTool('trapezoid')} title="Trapezoid (Manual Op)" className={getToolClass('trapezoid')}><Hash className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setActiveTool('document')} title="Document" className={getToolClass('document')}><FileText className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setActiveTool('cloud')} title="Cloud" className={getToolClass('cloud')}><CloudIcon className="w-4 h-4" /></Button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-zinc-700 mx-1 shrink-0" />
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

                    <div className="flex items-center gap-1 ml-4 border-l pl-4 border-slate-200 dark:border-zinc-700">
                        <Button variant="ghost" size="icon" onClick={() => handleZoom(0.9)} title="Zoom Out (Ctrl-)" className="text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"><ZoomOut className="w-4 h-4" /></Button>
                        <span className="text-xs w-10 text-center text-slate-500 dark:text-zinc-400">{Math.round(stageScale * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => handleZoom(1.1)} title="Zoom In (Ctrl+)" className="text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"><ZoomIn className="w-4 h-4" /></Button>
                    </div>

                    <div className="ml-auto flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => undoManagerRef.current?.undo()} className="dark:text-zinc-300 dark:hover:bg-zinc-800"><Undo className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => undoManagerRef.current?.redo()} className="dark:text-zinc-300 dark:hover:bg-zinc-800"><Redo className="w-4 h-4" /></Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" title="Export" className="dark:text-zinc-300 dark:hover:bg-zinc-800">
                                    <Download className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleExport('png')}>
                                    <ImageIcon className="w-4 h-4 mr-2" /> Export as PNG
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('jpg')}>
                                    <ImageIcon className="w-4 h-4 mr-2" /> Export as JPG
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('svg')}>
                                    <FileText className="w-4 h-4 mr-2" /> Export as SVG
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                        draggable={activeTool === 'hand' || isSpacePressed}
                        x={stagePos.x}
                        y={stagePos.y}
                        scaleX={stageScale}
                        scaleY={stageScale}
                        onWheel={handleWheel}
                        onDragEnd={(e) => {
                            // Only update state if stage was dragged
                            if (e.target === stageRef.current) {
                                setStagePos(e.target.position())
                            }
                        }}
                        onMouseDown={handleStageMouseDown}
                        onMouseMove={handleStageMouseMove}
                        onMouseUp={handleStageMouseUp}
                        onClick={handleStageClick}
                        onContextMenu={(e) => { e.evt.preventDefault(); }}
                        ref={stageRef}
                        className={`${activeTool === 'hand' || isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
                        style={{ background: 'transparent' }}
                    >
                        <Layer>
                            {elements.map((el) => {
                                if (!el.type) return null

                                // Common props for interactivity
                                const isSelected = selectedId === el.id
                                const commonProps = {
                                    id: el.id,
                                    draggable: (activeTool === 'select' && editingId !== el.id),
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

                                        const dash = el.lineType === 'dashed' ? [10, 10] : (el.lineType === 'dotted' ? [2, 5] : undefined)
                                        const pointerLength = el.arrowType === 'sharp' ? 20 : (el.arrowType === 'none' ? 0 : 10)
                                        const pointerWidth = el.arrowType === 'sharp' ? 10 : (el.arrowType === 'none' ? 0 : 10)
                                        const tension = el.lineType === 'curved' ? 0.4 : 0

                                        // For diamond arrow type (aggregation), we might need custom logic, but for now lets stick to Konva standard or simple overrides.
                                        // Konva Arrow doesn't support Diamond head natively easily without custom drawing.
                                        // Simulating Diamond by drawing a separate shape usually.
                                        // For simplicity in this iteration, 'diamond' will just be a larger square-ish head.

                                        return (
                                            <Group key={el.id}>
                                                <Arrow
                                                    points={points}
                                                    stroke={stroke}
                                                    fill={stroke}
                                                    strokeWidth={2}
                                                    pointerLength={pointerLength}
                                                    pointerWidth={pointerWidth}
                                                    dash={dash}
                                                    tension={tension}
                                                    lineCap="round"
                                                    lineJoin="round"
                                                    hitStrokeWidth={20}
                                                    onClick={(e) => {
                                                        e.cancelBubble = true;
                                                        setSelectedId(el.id);
                                                    }}
                                                    onContextMenu={(e) => handleContextMenu(e, el.id)}
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

                                else if (el.type === 'triangle') {
                                    return (
                                        <Group key={el.id} {...commonProps} x={el.x} y={el.y}>
                                            <RegularPolygon
                                                x={(el.width || 80) / 2} // Center
                                                y={(el.height || 80) / 2 + 5} // Check visual center
                                                sides={3}
                                                radius={(el.width || 80) / 2}
                                                fill={fill}
                                                stroke={stroke}
                                                rotation={el.rotation || 0}
                                                scaleX={1}
                                                scaleY={(el.height || 80) / (el.width || 80)} // Aspect ratio hack for RegularPolygon
                                            />
                                            {renderText()}
                                        </Group>
                                    )
                                } else if (el.type === 'hexagon') {
                                    return (
                                        <Group key={el.id} {...commonProps} x={el.x} y={el.y}>
                                            <RegularPolygon
                                                x={(el.width || 100) / 2}
                                                y={(el.height || 80) / 2}
                                                sides={6}
                                                radius={(el.width || 100) / 2}
                                                fill={fill}
                                                stroke={stroke}
                                                rotation={el.rotation || 0}
                                                scaleX={1}
                                                scaleY={(el.height || 80) / (el.width || 100)}
                                            />
                                            {renderText()}
                                        </Group>
                                    )
                                } else if (el.type === 'trapezoid') {
                                    const w = el.width || 100
                                    const h = el.height || 60
                                    return (
                                        <Group key={el.id} {...commonProps} x={el.x} y={el.y}>
                                            <Line
                                                points={[0, h, w * 0.2, 0, w * 0.8, 0, w, h]}
                                                closed
                                                fill={fill}
                                                stroke={stroke}
                                            />
                                            {renderText()}
                                        </Group>
                                    )
                                } else if (el.type === 'document') {
                                    const w = el.width || 80
                                    const h = el.height || 100
                                    // Simple wave path at bottom
                                    // Start top-left
                                    // M 0 0 L w 0 L w h-20 Q w*0.75 h w*0.5 h-20 T 0 h-20 Z
                                    return (
                                        <Group key={el.id} {...commonProps} x={el.x} y={el.y}>
                                            <Path
                                                data={`M 0 0 L ${w} 0 L ${w} ${h - 15} Q ${w * 0.75} ${h} ${w * 0.5} ${h - 15} T 0 ${h - 15} Z`}
                                                fill={fill}
                                                stroke={stroke}
                                                scaleX={1}
                                                scaleY={1}
                                            />
                                            {renderText()}
                                        </Group>
                                    )
                                } else if (el.type === 'cloud') {
                                    const w = el.width || 100
                                    const h = el.height || 80
                                    // Simple cloud path
                                    // M 10,50 Q 20,40 30,50 Q 40,20 60,30 Q 80,10 90,40 Q 100,50 90,60 Q 90,90 60,80 Q 40,90 20,70 Q 0,70 10,50 Z
                                    // Scalable path is hard with raw string.
                                    // We can use SVG path viewbox scaling, but Konva Path data is absolute.
                                    // Let's use a normalized path and scale it with group or just approximated points relative to w/h.
                                    // Or standard simple path:
                                    return (
                                        <Group key={el.id} {...commonProps} x={el.x} y={el.y}>
                                            <Path
                                                data={`M ${w * 0.1} ${h * 0.6} Q ${w * 0.2} ${h * 0.4} ${w * 0.3} ${h * 0.5} Q ${w * 0.4} ${h * 0.2} ${w * 0.6} ${h * 0.3} Q ${w * 0.8} ${h * 0.1} ${w * 0.9} ${h * 0.4} Q ${w} ${h * 0.5} ${w * 0.9} ${h * 0.6} Q ${w * 0.9} ${h * 0.9} ${w * 0.6} ${h * 0.8} Q ${w * 0.4} ${h * 0.9} ${w * 0.2} ${h * 0.7} Q 0 ${h * 0.7} ${w * 0.1} ${h * 0.6} Z`}
                                                fill={fill}
                                                stroke={stroke}
                                            />
                                            {renderText()}
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

                        // Calculate Screen Coordinates for positioning the popup
                        const screenX = (el.x || 0) * stageScale + stagePos.x
                        const screenY = (el.y || 0) * stageScale + stagePos.y
                        const screenW = w * stageScale
                        const screenH = h * stageScale

                        // Position popup to the right of the element
                        const popupLeft = screenX + screenW + 10
                        const popupTop = screenY

                        return (
                            <div
                                className="absolute z-50 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-xl rounded-lg p-3 min-w-[250px] animate-in fade-in zoom-in-95"
                                style={{
                                    left: popupLeft,
                                    top: popupTop,
                                }}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Edit Text</span>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 rounded-full"
                                        onClick={() => setEditingId(null)}
                                    >
                                        <span className="sr-only">Close</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    </Button>
                                </div>
                                <textarea
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            // Trigger Save
                                            if (yElementsRef.current) {
                                                const idx = elements.findIndex(e => e.id === editingId)
                                                if (idx !== -1) {
                                                    const newAttrs = { ...elements[idx], text: textInput }
                                                    yElementsRef.current.delete(idx, 1)
                                                    yElementsRef.current.insert(idx, [newAttrs])
                                                }
                                            }
                                            setEditingId(null)
                                        }
                                    }}
                                    placeholder="Enter text..."
                                    autoFocus
                                    className="w-full min-h-[80px] p-2 text-sm rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y mb-2 text-slate-900 dark:text-slate-100"
                                />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-7"
                                        onClick={() => setEditingId(null)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => {
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
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
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
                    {/* Arrow Style Pad */}
                    {(() => {
                        if (!selectedId) return null
                        const el = elements.find(e => e.id === selectedId)
                        if (el && (el.type === 'connection' || el.type === 'arrow')) {
                            // Calculate position roughly near user selection or fixed corner. 
                            // Fixed corner is safer for UI.
                            // Or utilize the popup positioning logic?
                            // Let's float it top-center or near toolbar.
                            return (
                                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 shadow-lg rounded-full p-2 flex gap-4 z-50 animate-in fade-in slide-in-from-top-5">
                                    <div className="flex items-center gap-2 border-r pr-4 dark:border-zinc-700">
                                        <span className="text-xs font-semibold text-slate-500 uppercase">Style</span>
                                        <div className="flex gap-1">
                                            {(['solid', 'dashed', 'dotted'] as const).map((type) => (
                                                <Button
                                                    key={type}
                                                    variant={el.lineType === type || (!el.lineType && type === 'solid') ? "default" : "ghost"}
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full"
                                                    onClick={() => {
                                                        if (yElementsRef.current) {
                                                            const idx = elements.findIndex(e => e.id === selectedId)
                                                            if (idx !== -1) {
                                                                const newAttrs = { ...elements[idx], lineType: type }
                                                                yElementsRef.current.delete(idx, 1)
                                                                yElementsRef.current.insert(idx, [newAttrs])
                                                            }
                                                        }
                                                    }}
                                                    title={type}
                                                >
                                                    {type === 'solid' && <Minus className="w-4 h-4" />}
                                                    {type === 'dashed' && <MoreHorizontal className="w-4 h-4" />}
                                                    {type === 'dotted' && <Dot className="w-4 h-4" />}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-slate-500 uppercase">Head</span>
                                        <div className="flex gap-1">
                                            {(['none', 'standard', 'sharp'] as const).map((type) => (
                                                <Button
                                                    key={type}
                                                    variant={el.arrowType === type || (!el.arrowType && type === 'standard') ? "default" : "ghost"}
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full"
                                                    onClick={() => {
                                                        if (yElementsRef.current) {
                                                            const idx = elements.findIndex(e => e.id === selectedId)
                                                            if (idx !== -1) {
                                                                const newAttrs = { ...elements[idx], arrowType: type }
                                                                yElementsRef.current.delete(idx, 1)
                                                                yElementsRef.current.insert(idx, [newAttrs])
                                                            }
                                                        }
                                                    }}
                                                    title={type}
                                                >
                                                    {type === 'none' && <Minus className="w-4 h-4" />}
                                                    {type === 'standard' && <ChevronRight className="w-4 h-4" />}
                                                    {type === 'sharp' && <ArrowRight className="w-4 h-4" />}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                        return null
                    })()}
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
            </div>
        </div>
    )
}
