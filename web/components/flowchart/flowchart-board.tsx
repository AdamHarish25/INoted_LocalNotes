"use client"

import React, { useEffect, useRef, useState } from "react"
import { Stage, Layer, Rect, Circle, Text as KonvaText, Line, Transformer, Image as KonvaImage } from "react-konva"
import { HocuspocusProvider } from "@hocuspocus/provider"
import * as Y from "yjs"
import { Button } from "@/components/ui/button"
import { Square, Circle as CircleIcon, Type, MousePointer2, Save, Undo, Redo, Eraser } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Loader2, Cloud } from "lucide-react"

interface FlowchartElement {
    id: string
    type: 'rectangle' | 'circle' | 'text' | 'arrow'
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
    const [activeTool, setActiveTool] = useState<'select' | 'rectangle' | 'circle' | 'text' | 'arrow'>('select')

    // Yjs
    const providerRef = useRef<HocuspocusProvider | null>(null)
    const ydocRef = useRef<Y.Doc | null>(null)
    const yElementsRef = useRef<Y.Array<FlowchartElement> | null>(null)
    const undoManagerRef = useRef<Y.UndoManager | null>(null)

    const stageRef = useRef<any>(null)
    const transformerRef = useRef<any>(null)
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')
    const supabase = createClient()

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
        // Deselect if clicked on empty stage
        if (e.target === e.target.getStage()) {
            setSelectedId(null)

            // Add element if tool is selected
            if (activeTool !== 'select') {
                const pos = e.target.getStage().getPointerPosition()
                const id = crypto.randomUUID()
                let newEl: FlowchartElement | null = null

                if (activeTool === 'rectangle') {
                    newEl = { id, type: 'rectangle', x: pos.x, y: pos.y, width: 100, height: 60, fill: '#ffffff', stroke: '#000000' }
                } else if (activeTool === 'circle') {
                    newEl = { id, type: 'circle', x: pos.x, y: pos.y, width: 50, height: 50, fill: '#ffffff', stroke: '#000000' } // width/height as radius approx
                } else if (activeTool === 'text') {
                    newEl = { id, type: 'text', x: pos.x, y: pos.y, text: 'Double click to edit', fill: '#000000' }
                }

                if (newEl && yElementsRef.current) {
                    yElementsRef.current.push([newEl])
                    setActiveTool('select') // revert to select
                    setSelectedId(id)
                }
            }
            return
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

            // Reset scale and update width/height
            node.scaleX(1)
            node.scaleY(1)

            const newAttrs = {
                ...elements[idx],
                x: node.x(),
                y: node.y(),
                width: Math.max(5, node.width() * scaleX),
                height: Math.max(5, node.height() * scaleY),
                rotation: node.rotation()
            }

            yElementsRef.current.delete(idx, 1)
            yElementsRef.current.insert(idx, [newAttrs])
        }
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Toolbar - Simple implementation */}
            <div className="flex items-center p-4 bg-white border-b gap-2">
                <Button variant={activeTool === 'select' ? 'default' : 'ghost'} size="icon" onClick={() => setActiveTool('select')}><MousePointer2 className="w-4 h-4" /></Button>
                <Button variant={activeTool === 'rectangle' ? 'default' : 'ghost'} size="icon" onClick={() => setActiveTool('rectangle')}><Square className="w-4 h-4" /></Button>
                <Button variant={activeTool === 'circle' ? 'default' : 'ghost'} size="icon" onClick={() => setActiveTool('circle')}><CircleIcon className="w-4 h-4" /></Button>
                <Button variant={activeTool === 'text' ? 'default' : 'ghost'} size="icon" onClick={() => setActiveTool('text')}><Type className="w-4 h-4" /></Button>


                <div className="flex items-center gap-2 text-sm text-slate-500 ml-4">
                    {saveStatus === 'saving' ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <Cloud className="w-4 h-4" />
                            <span>Saved</span>
                        </>
                    )}
                </div>

                <div className="ml-auto flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => undoManagerRef.current?.undo()}><Undo className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => undoManagerRef.current?.redo()}><Redo className="w-4 h-4" /></Button>
                </div>
            </div>

            <div className="flex-1 bg-gray-100 overflow-hidden relative">
                <Stage
                    width={typeof window !== 'undefined' ? window.innerWidth : 1000}
                    height={typeof window !== 'undefined' ? window.innerHeight - 80 : 800}
                    onClick={handleStageClick}
                    ref={stageRef}
                >
                    <Layer>
                        {elements.map((el) => {
                            if (el.type === 'rectangle') {
                                return <Rect
                                    key={el.id}
                                    id={el.id}
                                    x={el.x}
                                    y={el.y}
                                    width={el.width}
                                    height={el.height}
                                    fill={el.fill}
                                    stroke={el.stroke}
                                    draggable={activeTool === 'select'}
                                    onClick={() => setSelectedId(el.id)}
                                    onDragEnd={(e) => handleElementDragEnd(e, el.id)}
                                    onTransformEnd={handleTransformEnd}
                                />
                            } else if (el.type === 'circle') {
                                return <Circle
                                    key={el.id}
                                    id={el.id}
                                    x={el.x}
                                    y={el.y}
                                    radius={el.width ? el.width / 2 : 25} // approx
                                    scaleX={el.width && el.height ? 1 : 1} // Handled by transformer usually
                                    fill={el.fill}
                                    stroke={el.stroke}
                                    draggable={activeTool === 'select'}
                                    onClick={() => setSelectedId(el.id)}
                                    onDragEnd={(e) => handleElementDragEnd(e, el.id)}
                                // Transform logic for circle needs radius update
                                />
                            } else if (el.type === 'text') {
                                return <KonvaText
                                    key={el.id}
                                    id={el.id}
                                    x={el.x}
                                    y={el.y}
                                    text={el.text}
                                    fill={el.fill}
                                    fontSize={20}
                                    draggable={activeTool === 'select'}
                                    onClick={() => setSelectedId(el.id)}
                                    onDragEnd={(e) => handleElementDragEnd(e, el.id)}
                                />
                            }
                            return null
                        })}
                        <Transformer ref={transformerRef} />
                    </Layer>
                </Stage>
            </div>
        </div>
    )
}
