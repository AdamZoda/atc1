
import React, { useState, useRef } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Code from '@tiptap/extension-code';
import { ResizableImage } from './ResizableImage';
import { supabase } from '../../supabaseClient';
import {
    Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
    Image as ImageIcon, Link as LinkIcon, AlignLeft, AlignCenter,
    AlignRight, Heading1, Heading2, Quote, Undo, Redo, Type,
    X, Upload, Globe, ChevronDown, Check, Loader2, Strikethrough, Code as CodeIcon
} from 'lucide-react';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    editable?: boolean;
}

const ToolbarButton = ({ onClick, isActive, disabled, children, title, className = "" }: any) => (
    <button
        onMouseDown={(e) => {
            // Prevent the button from taking focus away from the editor
            e.preventDefault();
            onClick();
        }}
        disabled={disabled}
        title={title}
        className={`
            p-1.5 min-w-[32px] rounded flex items-center justify-center transition-all duration-200
            ${disabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/10 text-gray-300 hover:text-white'}
            ${isActive ? 'bg-[#c5a059]/20 text-[#c5a059] ring-1 ring-[#c5a059]' : ''}
            ${className}
        `}
    >
        {children}
    </button>
);

const Divider = () => <div className="w-px h-6 bg-white/10 mx-1"></div>;

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, editable = true }) => {

    // UI States
    const [imageMenuOpen, setImageMenuOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState<'image' | 'link' | null>(null);
    const [urlInput, setUrlInput] = useState('');
    const [textInput, setTextInput] = useState(''); // New for links
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Code,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-[#c5a059] hover:underline cursor-pointer',
                },
            }),
            Image.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        width: {
                            default: '100%',
                            renderHTML: attributes => ({
                                style: `width: ${attributes.width}`,
                            }),
                        },
                        textAlign: {
                            default: 'center',
                            renderHTML: attributes => ({
                                'data-align': attributes.textAlign,
                            }),
                        },
                    }
                },
                addNodeView() {
                    return ReactNodeViewRenderer(ResizableImage)
                },
            }).configure({
                inline: true,
                allowBase64: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph', 'image'],
            }),
            Placeholder.configure({
                placeholder: 'Commencez la rédaction premium...',
            }),
        ],
        content: content,
        editable: editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-invert prose-lg max-w-none focus:outline-none min-h-[800px] px-8 py-10 bg-[#0d0d0d] text-white shadow-2xl outline-none',
            },
        },
    });

    if (!editor) return null;

    // --- Media Logics ---

    const handleUrlSubmit = () => {
        if (!urlInput) return;

        if (modalOpen === 'image') {
            editor.chain().focus().setImage({ src: urlInput }).run();
        } else if (modalOpen === 'link') {
            const { from, to } = editor.state.selection;
            const hasSelection = from !== to;

            if (hasSelection) {
                editor.chain().focus().extendMarkRange('link').setLink({ href: urlInput }).run();
            } else {
                // If no selection, insert the display text (or URL) and then link it
                const display = textInput || urlInput;
                editor.chain().focus().insertContent(display).extendMarkRange('link').setLink({ href: urlInput }).run();
            }
        }

        setUrlInput('');
        setTextInput('');
        setModalOpen(null);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `blog/${fileName}`;

            const { data, error } = await supabase.storage
                .from('chat-media')
                .upload(filePath, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-media')
                .getPublicUrl(filePath);

            editor.chain().focus().setImage({ src: publicUrl }).run();
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Erreur lors du téléchargement de l\'image.');
        } finally {
            setIsUploading(false);
            setImageMenuOpen(false);
        }
    };

    if (!editable) {
        return (
            <div className="bg-[#0a0a0a] text-white p-8 md:p-12 shadow-2xl min-h-screen max-w-[21cm] mx-auto my-8 border border-white/5">
                <EditorContent editor={editor} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] relative">

            {/* Dark Premium Ribbon */}
            <div className="sticky top-0 z-20 bg-[#111111] border-b border-white/10 shadow-lg px-4 py-2 flex flex-wrap gap-1 items-center backdrop-blur-md">

                {/* Basic Formatting */}
                <div className="flex items-center gap-0.5">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Gras">
                        <Bold size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italique">
                        <Italic size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Souligné">
                        <UnderlineIcon size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Barré">
                        <Strikethrough size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Code">
                        <CodeIcon size={18} />
                    </ToolbarButton>
                </div>

                <Divider />

                {/* Headings */}
                <div className="flex items-center gap-0.5">
                    <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} isActive={editor.isActive('paragraph')} title="Paragraphe">
                        <Type size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Titre 1">
                        <Heading1 size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Titre 2">
                        <Heading2 size={18} />
                    </ToolbarButton>
                </div>

                <Divider />

                {/* Alignment */}
                <div className="flex items-center gap-0.5">
                    <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Aligner à gauche">
                        <AlignLeft size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Centrer">
                        <AlignCenter size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Aligner à droite">
                        <AlignRight size={18} />
                    </ToolbarButton>
                </div>

                <Divider />

                {/* Media & Lists */}
                <div className="flex items-center gap-0.5 relative">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Liste à puces">
                        <List size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Liste numérotée">
                        <ListOrdered size={18} />
                    </ToolbarButton>

                    {/* Link Button */}
                    <ToolbarButton
                        onClick={() => {
                            const previousUrl = editor.getAttributes('link').href;
                            const { from, to } = editor.state.selection;
                            const selectedText = editor.state.doc.textBetween(from, to, ' ');

                            setUrlInput(previousUrl || '');
                            setTextInput(selectedText || '');
                            setModalOpen('link');
                        }}
                        isActive={editor.isActive('link')}
                        title="Lien"
                    >
                        <LinkIcon size={18} />
                    </ToolbarButton>

                    {/* Image Button with SLIDE MENU */}
                    <div className="relative">
                        <ToolbarButton
                            onClick={() => setImageMenuOpen(!imageMenuOpen)}
                            isActive={imageMenuOpen}
                            title="Menu Image"
                        >
                            <ImageIcon size={18} />
                            <ChevronDown size={12} className={`ml-0.5 transition-transform ${imageMenuOpen ? 'rotate-180' : ''}`} />
                        </ToolbarButton>

                        {imageMenuOpen && (
                            <div className="absolute top-full left-0 mt-1 w-48 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden animate-slide-down">
                                <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => { setModalOpen('image'); setImageMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-[#c5a059] transition-colors text-left"
                                >
                                    <Globe size={16} /> Par URL
                                </button>
                                <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => { fileInputRef.current?.click(); setImageMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-[#c5a059] transition-colors border-t border-white/5 text-left"
                                >
                                    <Upload size={16} /> Importer du PC
                                </button>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>

                    <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Citation">
                        <Quote size={18} />
                    </ToolbarButton>
                </div>

                <div className="flex-grow"></div>

                {/* Undo/Redo */}
                <div className="flex items-center gap-0.5 text-gray-400">
                    <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annuler">
                        <Undo size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rétablir">
                        <Redo size={18} />
                    </ToolbarButton>
                </div>
            </div>

            {/* Editor Area - "Paper" Look */}
            <div className="flex-1 overflow-y-auto bg-black p-8 pt-4 cursor-text" onClick={() => editor.chain().focus().run()}>
                <div className="max-w-[21cm] mx-auto min-h-[1000px] bg-[#0d0d0d] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5">
                    <EditorContent editor={editor} />
                </div>
            </div>

            {/* CUSTOM MODAL FOR URL INPUTS */}
            {modalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setModalOpen(null)} />
                    <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-xl shadow-2xl p-6 animate-zoom-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[#c5a059] font-cinzel font-bold text-lg uppercase tracking-wider">
                                {modalOpen === 'image' ? 'Insérer une image' : 'Ajouter un lien'}
                            </h3>
                            <button onClick={() => setModalOpen(null)} className="p-1 hover:bg-white/10 rounded-full text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {modalOpen === 'link' && (
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-500 uppercase font-bold tracking-widest pl-1">Texte à afficher</label>
                                    <input
                                        type="text"
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        placeholder="Mon super lien"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[#c5a059] outline-none transition-colors"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase font-bold tracking-widest pl-1">URL de la ressource</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[#c5a059] outline-none transition-colors"
                                    onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                                />
                            </div>

                            <button
                                onClick={handleUrlSubmit}
                                className="w-full bg-[#c5a059] hover:bg-[#b08d4a] text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#c5a059]/10"
                            >
                                <Check size={18} /> Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UPLOADING OVERLAY */}
            {isUploading && (
                <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                    <Loader2 size={48} className="text-[#c5a059] animate-spin" />
                    <p className="text-white font-cinzel tracking-widest uppercase text-sm">Téléchargement en cours...</p>
                </div>
            )}

            <style>{`
                @keyframes slide-down {
                    from { transform: translateY(-10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes zoom-in {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-slide-down { animation: slide-down 0.2s ease-out; }
                .animate-zoom-in { animation: zoom-in 0.2s ease-out; }
            `}</style>
        </div>
    );
};

export default RichTextEditor;
