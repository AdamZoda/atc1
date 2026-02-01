import React from 'react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import { Trash2, GripVertical, Image as ImageIcon, Type, Video, X } from 'lucide-react';

export type BlockType = 'text' | 'image' | 'video' | 'html';

export interface Block {
    id: string;
    type: BlockType;
    content: string; // HTML for text, URL for image/video
    metadata?: any; // Alt text, captions, etc.
}

interface BlockEditorProps {
    blocks: Block[];
    onChange: (blocks: Block[]) => void;
    readOnly?: boolean;
}

const BlockEditor: React.FC<BlockEditorProps> = ({ blocks, onChange, readOnly = false }) => {

    const addBlock = (type: BlockType) => {
        const newBlock: Block = {
            id: crypto.randomUUID(),
            type,
            content: '',
        };
        onChange([...blocks, newBlock]);
    };

    const updateBlock = (id: string, content: string) => {
        onChange(blocks.map(b => b.id === id ? { ...b, content } : b));
    };

    const removeBlock = (id: string) => {
        onChange(blocks.filter(b => b.id !== id));
    };

    if (readOnly) {
        return (
            <div className="space-y-6">
                {blocks.map(block => (
                    <div key={block.id} className="block-content">
                        {block.type === 'text' && <div dangerouslySetInnerHTML={{ __html: block.content }} className="prose prose-invert max-w-none" />}
                        {block.type === 'image' && <img src={block.content} alt="Blog Content" className="w-full rounded-xl" />}
                        {block.type === 'video' && (
                            <div className="aspect-video">
                                <iframe src={block.content} className="w-full h-full rounded-xl" allowFullScreen />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Reorder.Group axis="y" values={blocks} onReorder={onChange} className="space-y-4">
                {blocks.map((block) => (
                    <Reorder.Item key={block.id} value={block} className="relative group">
                        <div className="flex gap-2 items-start bg-white/5 p-4 rounded-xl border border-white/10 group-hover:border-luxury-gold/30 transition-colors">
                            {/* Drag Handle */}
                            <div className="mt-2 cursor-grab active:cursor-grabbing text-gray-500 hover:text-white">
                                <GripVertical size={20} />
                            </div>

                            {/* Content Area */}
                            <div className="flex-grow">
                                {block.type === 'text' && (
                                    <textarea
                                        value={block.content}
                                        onChange={(e) => updateBlock(block.id, e.target.value)}
                                        placeholder="Écrivez votre texte ici (HTML supporté)..."
                                        className="w-full bg-transparent text-gray-200 outline-none resize-y min-h-[100px] p-2"
                                    />
                                )}
                                {block.type === 'image' && (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <ImageIcon size={20} className="text-gray-400" />
                                            <input
                                                type="text"
                                                value={block.content}
                                                onChange={(e) => updateBlock(block.id, e.target.value)}
                                                placeholder="URL de l'image (https://...)"
                                                className="w-full bg-transparent border-b border-white/10 focus:border-luxury-gold outline-none pb-1"
                                            />
                                        </div>
                                        {block.content && (
                                            <img src={block.content} alt="Preview" className="h-32 rounded-lg object-cover" />
                                        )}
                                    </div>
                                )}
                                {block.type === 'video' && (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <Video size={20} className="text-gray-400" />
                                            <input
                                                type="text"
                                                value={block.content}
                                                onChange={(e) => updateBlock(block.id, e.target.value)}
                                                placeholder="URL de la vidéo / Embed"
                                                className="w-full bg-transparent border-b border-white/10 focus:border-luxury-gold outline-none pb-1"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <button
                                onClick={() => removeBlock(block.id)}
                                className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-lg"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </Reorder.Item>
                ))}
            </Reorder.Group>

            {/* Add Block Controls */}
            <div className="flex gap-2 justify-center py-4 border-t border-white/5 border-dashed">
                <button onClick={() => addBlock('text')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors">
                    <Type size={16} /> Texte
                </button>
                <button onClick={() => addBlock('image')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors">
                    <ImageIcon size={16} /> Image
                </button>
                <button onClick={() => addBlock('video')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors">
                    <Video size={16} /> Vidéo
                </button>
            </div>
        </div>
    );
};

export default BlockEditor;
