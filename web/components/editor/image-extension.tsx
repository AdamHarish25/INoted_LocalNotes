"use client"

import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"
import { Image as BaseImage } from "@tiptap/extension-image"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
// We might need some icons for alignment if we build a menu inside the node view, 
// but Tiptap BubbleMenu is better for that.

// Define the NodeView Component
const ResizableImageComponent = (props: any) => {
    const { node, updateAttributes, selected, editor } = props
    const [isResizing, setIsResizing] = useState(false)
    const [aspectRatio, setAspectRatio] = useState(1)
    const imageRef = useRef<HTMLImageElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Initial size from attributes or defaults
    const [width, setWidth] = useState(node.attrs.width || '100%')
    const [height, setHeight] = useState(node.attrs.height || 'auto')

    // Alignment
    const alignment = node.attrs.textAlign || 'center'

    useEffect(() => {
        if (imageRef.current) {
            imageRef.current.onload = () => {
                setAspectRatio(imageRef.current!.naturalWidth / imageRef.current!.naturalHeight)
            }
        }
    }, [])

    const handleMouseDown = (e: React.MouseEvent, direction: string) => {
        e.preventDefault()
        e.stopPropagation()
        setIsResizing(true)

        const startX = e.clientX
        const startWidth = imageRef.current ? imageRef.current.offsetWidth : 0

        const handleMouseMove = (e: MouseEvent) => {
            // Simple width resizing
            const currentX = e.clientX
            let diffX = currentX - startX

            // If dragging left handle, invert logic if we implemented left handle (omitted for now)

            let newWidth = startWidth + diffX
            if (newWidth < 100) newWidth = 100 // Min width

            // Update local state for smooth resize
            setWidth(`${newWidth}px`)
            setHeight('auto') // Keep aspect ratio
        }

        const handleMouseUp = () => {
            setIsResizing(false)
            updateAttributes({ width: `${imageRef.current?.offsetWidth}px`, height: 'auto' })
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }

    return (
        <NodeViewWrapper className="resisable-image-wrapper flex" style={{ justifyContent: alignment }}>
            <div
                ref={containerRef}
                className={cn(
                    "relative group inline-block transition-all",
                    selected ? "ring-2 ring-primary ring-offset-2" : ""
                )}
                style={{ width: width, maxWidth: '100%' }}
            >
                {/* Image */}
                <img
                    ref={imageRef}
                    src={node.attrs.src}
                    alt={node.attrs.title}
                    className="rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 w-full object-cover"
                />

                {/* Resize Handle (Bottom Right) */}
                {/* Only show when selected or hovering? Tiptap selection is better. */}
                <div
                    className={cn(
                        "absolute bottom-2 right-2 w-4 h-4 bg-primary rounded-full cursor-nwse-resize shadow-md border-2 border-white z-10 opacity-0 group-hover:opacity-100 transition-opacity",
                        selected ? "opacity-100" : ""
                    )}
                    onMouseDown={(e) => handleMouseDown(e, 'se')}
                />
            </div>
        </NodeViewWrapper>
    )
}

// Define the Extension
export const ResizableImageExtension = BaseImage.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: '100%',
                renderHTML: (attributes) => {
                    return {
                        width: attributes.width,
                        style: `width: ${attributes.width}`
                    }
                }
            },
            height: {
                default: 'auto',
                renderHTML: (attributes) => {
                    return {
                        height: attributes.height,
                        style: `height: ${attributes.height}`
                    }
                }
            },
            textAlign: {
                default: 'center',
                renderHTML: (attributes) => {
                    // Styles are handled by wrapper or parent
                    return {
                        'data-align': attributes.textAlign
                    }
                },
                parseHTML: (element) => {
                    return element.getAttribute('data-align')
                }
            }
        }
    },

    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageComponent)
    },
})
