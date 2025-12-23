"use client"

import React, { useEffect, useRef, useState } from "react"
import { Stage, Layer, Rect, Circle, Text as KonvaText, Line, Transformer, RegularPolygon, Path, Group } from "react-konva"
import { HocuspocusProvider } from "@hocuspocus/provider"
import * as Y from "yjs"
import { Button } from "@/components/ui/button"
import { Square, Circle as CircleIcon, Type, MousePointer2, Save, Undo, Redo, Phone, Database, Hexagon, Component, RectangleHorizontal, Diamond, Trash2, Pencil, RefreshCw } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Loader2, Cloud } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useTheme } from "next-themes"

interface FlowchartElement {
    id: string
    type: 'rectangle' | 'circle' | 'text' | 'arrow' | 'diamond' | 'cylinder' | 'parallelogram' | 'rounded_rect'
    x: number
    y: number
    width?: number
    height?: number
    fill?: string
    stroke?: string
    text?: string
    points?: number[]
    rotation?: number
}

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#000000', '#ffffff']

export default function FlowchartBoard({ roomId, initialData }: { roomId: string, initialData?: any[] }) {
    const [elements, setElements] = useState<FlowchartElement[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [activeTool, setActiveTool] = useState<'select' | 'rectangle' | 'circle' | 'text' | 'arrow' | 'diamond' | 'cylinder' | 'parallelogram' | 'rounded_rect'>('select')

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
    const supabase = createClient()

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
        // If white fill in dark mode? Usually we keep fills as is, but white box in dark mode is bright.
        // Let's invert white fill to dark fill? No, that changes the "paper" look.
        // Excalidraw keeps backgrounds transparent often.
        // Let's assume white fill is "default background" --> make it transparent or dark grey?
        // For now, let's keep fills authentic to data, but default creation should be mindful.
        return color
    }

    // Save to Supabase
    useEffect(() => {
        if (elements.length === 0) return

        const saveToDb = async () => {
            setSaveStatus('saving')
            try {
                const { error } = await supabase
                    .from('flowcharts')
                    .update({ content: elements })
                    .eq('id', roomId)

                if (error) {
                    console.error("Supabase Save Error:", error)
                }
            } catch (err) {
                console.error("Save failed:", err)
            } finally {
                setSaveStatus('saved')
            }
        }

        const timeoutId = setTimeout(saveToDb, 2000)
        return () => clearTimeout(timeoutId)
    }, [elements, roomId, supabase])

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

    const handleStageClick = (e: any) => {
        // Close context menu if visible
        if (contextMenu.visible) {
            setContextMenu({ ...contextMenu, visible: false })
            return
        }

        const clickedOnEmpty = e.target === e.target.getStage()

        // Handle Tool Creation
        if (activeTool !== 'select') {
            // Create element
            const pos = e.target.getStage().getPointerPosition()
            const id = crypto.randomUUID()
            let newEl: FlowchartElement | null = null

            // Default colors: White fill, Black stroke (will be inverted in render if dark mode)
            // We save "semantic" colors usually, or explicit ones.
            // Let's save explicit #ffffff / #000000 and rely on the renderer to invert if needed, 
            // OR save them as "theme-dependent"? No, save standard.
            const defaultFill = '#ffffff'
            const defaultStroke = '#000000'

            if (activeTool === 'rectangle') {
                newEl = { id, type: 'rectangle', x: pos.x, y: pos.y, width: 100, height: 60, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'circle') {
                newEl = { id, type: 'circle', x: pos.x, y: pos.y, width: 60, height: 60, fill: defaultFill, stroke: defaultStroke }
            } else if (activeTool === 'text') {
                // For text, we usually want 'transparent' fill but black text color (fill prop on Text)
                newEl = { id, type: 'text', x: pos.x, y: pos.y, text: 'Click to edit', fill: defaultStroke }
            } else if (activeTool === 'diamond') {
                newEl = { id, type: 'diamond', x: pos.x, y: pos.y, width: 100, height: 100, fill: defaultFill, stroke: defaultStroke } // Fixed size to be square-ish
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
            // Find clicked group/shape
            const id = e.target.id() || e.target.parent?.id()
            if (id) setSelectedId(id)
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
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-black/90 relative transition-colors duration-200">
            {/* Toolbar */}
            <div className="flex items-center p-4 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 gap-2 overflow-x-auto shadow-sm">
                <Button variant={activeTool === 'select' ? 'default' : 'ghost'} size="icon" onClick={() => setActiveTool('select')} title="Select" className="shrink-0"><MousePointer2 className="w-4 h-4" /></Button>
                <div className="w-px h-6 bg-slate-200 dark:bg-zinc-700 mx-1 shrink-0" />
                <Button variant={activeTool === 'rectangle' ? 'default' : 'ghost'} size="icon" onClick={() => setActiveTool('rectangle')} title="Rectangle" className="shrink-0"><Square className="w-4 h-4" /></Button>
                <Button variant={activeTool === 'rounded_rect' ? 'default' : 'ghost'} size="icon" onClick={() => setActiveTool('rounded_rect')} title="Rounded Rectangle" className="shrink-0"><RectangleHorizontal className="w-4 h-4 rounded-xl" /></Button>
                <Button variant={activeTool === 'circle' ? 'default' : 'ghost'} size="icon" onClick={() => setActiveTool('circle')} title="Ellipse" className="shrink-0"><CircleIcon className="w-4 h-4" /></Button>
                <Button variant={activeTool === 'diamond' ? 'default' : 'ghost'} size="icon" onClick={() => setActiveTool('diamond')} title="Decision" className="shrink-0"><Diamond className="w-4 h-4" /></Button>
                <Button variant={activeTool === 'parallelogram' ? 'default' : 'ghost'} size="icon" onClick={() => setActiveTool('parallelogram')} title="Data" className="shrink-0"><Component className="w-4 h-4" /></Button>
                <Button variant={activeTool === 'cylinder' ? 'default' : 'ghost'} size="icon" onClick={() => setActiveTool('cylinder')} title="Database" className="shrink-0"><Database className="w-4 h-4" /></Button>
                <div className="w-px h-6 bg-slate-200 dark:bg-zinc-700 mx-1 shrink-0" />
                <Button variant={activeTool === 'text' ? 'default' : 'ghost'} size="icon" onClick={() => setActiveTool('text')} title="Text" className="shrink-0"><Type className="w-4 h-4" /></Button>

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

            <div className="flex-1 bg-gray-100 dark:bg-black overflow-hidden relative">
                <Stage
                    width={windowSize.width}
                    height={windowSize.height}
                    onClick={handleStageClick}
                    onContextMenu={(e) => { e.evt.preventDefault(); }}
                    ref={stageRef}
                    className="cursor-crosshair active:cursor-grabbing"
                    style={{ background: theme === 'dark' ? '#09090b' : '#f3f4f6' }} // Match zinc-950 or gray-100
                >
                    <Layer>
                        {elements.map((el) => {
                            const commonProps = {
                                key: el.id,
                                id: el.id,
                                draggable: activeTool === 'select',
                                onClick: () => setSelectedId(el.id),
                                onDragEnd: (e: any) => handleElementDragEnd(e, el.id),
                                onTransformEnd: handleTransformEnd,
                                onContextMenu: (e: any) => handleContextMenu(e, el.id),
                            }

                            // Dynamic colors
                            const stroke = getRenderColor(el.stroke)
                            const fill = el.fill || (theme === 'dark' ? 'transparent' : '#ffffff')

                            // Text Color: If element type is text, use its fill property (color), adjusted for theme
                            const textColor = el.type === 'text' ? getRenderColor(el.fill) : getRenderColor('#000000')

                            // Render Text centered if exists
                            const renderText = () => (
                                el.text ? <KonvaText
                                    text={el.text}
                                    x={0}
                                    y={0}
                                    width={el.width}
                                    height={el.height}
                                    align="center"
                                    verticalAlign="middle"
                                    fontSize={14}
                                    padding={5}
                                    fill={textColor}
                                    listening={false} // pass clicks to shape
                                /> : null
                            )

                            if (el.type === 'rectangle') {
                                return (
                                    <Group {...commonProps} x={el.x} y={el.y}>
                                        <Rect width={el.width} height={el.height} fill={fill} stroke={stroke} shadowBlur={theme === 'dark' ? 0 : 2} />
                                        {renderText()}
                                    </Group>
                                )
                            } else if (el.type === 'rounded_rect') {
                                return (
                                    <Group {...commonProps} x={el.x} y={el.y}>
                                        <Rect width={el.width} height={el.height} fill={fill} stroke={stroke} cornerRadius={20} shadowBlur={theme === 'dark' ? 0 : 2} />
                                        {renderText()}
                                    </Group>
                                )
                            } else if (el.type === 'circle') {
                                return (
                                    <Group {...commonProps} x={el.x} y={el.y}>
                                        <Circle width={el.width} height={el.height} fill={fill} stroke={stroke} offsetX={-(el.width || 0) / 2} offsetY={-(el.height || 0) / 2} shadowBlur={theme === 'dark' ? 0 : 2} />
                                        <KonvaText
                                            text={el.text}
                                            x={0}
                                            y={0} width={el.width} height={el.height} align="center" verticalAlign="middle" padding={5}
                                            fill={textColor}
                                            listening={false}
                                        />
                                    </Group>
                                )
                            } else if (el.type === 'diamond') {
                                return (
                                    <Group {...commonProps} x={el.x} y={el.y}>
                                        <RegularPolygon sides={4} radius={(el.width || 0) / 2} fill={fill} stroke={stroke}
                                            x={(el.width || 0) / 2} y={(el.height || 0) / 2} // Center polygon in group box
                                            shadowBlur={theme === 'dark' ? 0 : 2}
                                        />
                                        {renderText()}
                                    </Group>
                                )
                            } else if (el.type === 'parallelogram') {
                                // Draw manually with Line closed
                                const w = el.width || 100
                                const h = el.height || 60
                                const skew = 20
                                return (
                                    <Group {...commonProps} x={el.x} y={el.y}>
                                        <Line
                                            points={[skew, 0, w, 0, w - skew, h, 0, h]}
                                            closed
                                            fill={fill} stroke={stroke}
                                            shadowBlur={theme === 'dark' ? 0 : 2}
                                        />
                                        {renderText()}
                                    </Group>
                                )
                            } else if (el.type === 'cylinder') {
                                const w = el.width || 60
                                const h = el.height || 80
                                return (
                                    <Group {...commonProps} x={el.x} y={el.y}>
                                        <Path
                                            data={`M 0 ${h * 0.15} V ${h * 0.85} Q ${w / 2} ${h} ${w} ${h * 0.85} V ${h * 0.15}`}
                                            fill={fill} stroke={stroke}
                                        />
                                        <Line points={[0, h * 0.15, 0, h * 0.85]} stroke={stroke} />
                                        <Line points={[w, h * 0.15, w, h * 0.85]} stroke={stroke} />
                                        <Circle x={w / 2} y={h * 0.85} radiusX={w / 2} radiusY={h * 0.15} stroke={stroke} fill={fill} />
                                        {/* Top cover (filled) */}
                                        <Circle x={w / 2} y={h * 0.15} radiusX={w / 2} radiusY={h * 0.15} stroke={stroke} fill={fill} />

                                        {renderText()}
                                    </Group>
                                )
                            } else if (el.type === 'text') {
                                return <KonvaText
                                    {...commonProps}
                                    x={el.x}
                                    y={el.y}
                                    text={el.text || "Text"}
                                    fill={textColor}
                                    fontSize={20}
                                />
                            }
                            return null
                        })}
                        <Transformer ref={transformerRef} />
                    </Layer>
                </Stage>

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
        </div>
    )
}
