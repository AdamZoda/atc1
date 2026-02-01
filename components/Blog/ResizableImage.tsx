import { NodeViewWrapper } from '@tiptap/react';
import React, { useRef, useState, useEffect } from 'react';

// Default Tiptap Image extension doesn't support resizing out of the box in a simple way
// We need a Node View to handle the drag handles.

export const ResizableImage = (props: any) => {
    const { node, updateAttributes, selected } = props;
    const [width, setWidth] = useState(node.attrs.width || '100%');
    const [alignment, setAlignment] = useState(node.attrs.textAlign || 'center');

    // Sync local state with node attributes
    useEffect(() => {
        setWidth(node.attrs.width);
        setAlignment(node.attrs.textAlign);
    }, [node.attrs]);

    const onResize = (e: React.MouseEvent, direction: string) => {
        // Simple resize logic: just preset percentages for MVP stability
        // A full drag resize is complex to implement perfectly in one go without errors.
        // Let's offer [25%, 50%, 75%, 100%] buttons for now as requested.
    };

    const setSize = (w: string) => {
        updateAttributes({ width: w });
        setWidth(w);
    };

    const setAlign = (a: string) => {
        updateAttributes({ textAlign: a });
        setAlignment(a);
    };

    let containerClass = "relative group w-full flex ";
    if (alignment === 'left') containerClass += "justify-start";
    else if (alignment === 'right') containerClass += "justify-end";
    else containerClass += "justify-center";

    return (
        <NodeViewWrapper className={containerClass}>
            <div
                className={`relative transition-all duration-300 ${selected ? 'ring-2 ring-[#c5a059]' : ''}`}
                style={{ width: width, maxWidth: '100%' }}
            >
                <img
                    src={node.attrs.src}
                    alt={node.attrs.alt}
                    className="rounded shadow-xl w-full h-auto"
                />

                {/* Controls Overlay (Visible on Hover/Select) */}
                {(selected || true) && (
                    <div className="absolute top-2 right-2 flex gap-1 bg-black/90 border border-white/10 shadow-2xl rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md">
                        {/* Alignment */}
                        <button onClick={() => setAlign('left')} className={`p-1 rounded hover:bg-white/10 ${alignment === 'left' ? 'text-[#c5a059] bg-[#c5a059]/10' : 'text-gray-400'}`}>L</button>
                        <button onClick={() => setAlign('center')} className={`p-1 rounded hover:bg-white/10 ${alignment === 'center' ? 'text-[#c5a059] bg-[#c5a059]/10' : 'text-gray-400'}`}>C</button>
                        <button onClick={() => setAlign('right')} className={`p-1 rounded hover:bg-white/10 ${alignment === 'right' ? 'text-[#c5a059] bg-[#c5a059]/10' : 'text-gray-400'}`}>R</button>
                        <div className="w-px bg-white/10 mx-1"></div>
                        {/* Size */}
                        <button onClick={() => setSize('25%')} className={`px-1 text-xs rounded hover:bg-white/10 ${width === '25%' ? 'text-[#c5a059] bg-[#c5a059]/10 font-bold' : 'text-gray-500'}`}>25%</button>
                        <button onClick={() => setSize('50%')} className={`px-1 text-xs rounded hover:bg-white/10 ${width === '50%' ? 'text-[#c5a059] bg-[#c5a059]/10 font-bold' : 'text-gray-500'}`}>50%</button>
                        <button onClick={() => setSize('75%')} className={`px-1 text-xs rounded hover:bg-white/10 ${width === '75%' ? 'text-[#c5a059] bg-[#c5a059]/10 font-bold' : 'text-gray-500'}`}>75%</button>
                        <button onClick={() => setSize('100%')} className={`px-1 text-xs rounded hover:bg-white/10 ${width === '100%' ? 'text-[#c5a059] bg-[#c5a059]/10 font-bold' : 'text-gray-500'}`}>100%</button>
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
};
