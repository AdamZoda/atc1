import React, { useRef, useState } from 'react';
import {
    Bold, Italic, Underline, Heading1, Heading2, Heading3,
    Link, Image, List, ListOrdered, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, className = '' }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    const execCommand = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            editorRef.current.focus();
            onChange(editorRef.current.innerHTML);
        }
    };

    const addLink = () => {
        const url = prompt('Entrez l\'URL du lien:');
        if (url) execCommand('createLink', url);
    };

    const addImage = () => {
        const url = prompt('Entrez l\'URL de l\'image:');
        if (url) execCommand('insertImage', url);
    };

    const ToolbarButton = ({ icon: Icon, command, value, title }: any) => (
        <button
            type="button"
            onClick={() => command === 'createLink' ? addLink() : (command === 'insertImage' ? addImage() : execCommand(command, value))}
            className="p-2 text-gray-400 hover:text-luxury-gold hover:bg-white/5 rounded-lg transition-colors"
            title={title}
        >
            <Icon size={18} />
        </button>
    );

    return (
        <div className={`flex flex-col border border-white/10 rounded-xl overflow-hidden bg-black/20 ${className} ${isFocused ? 'ring-1 ring-luxury-gold/50' : ''}`}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-white/5 border-b border-white/10">
                <ToolbarButton icon={Bold} command="bold" title="Gras" />
                <ToolbarButton icon={Italic} command="italic" title="Italique" />
                <ToolbarButton icon={Underline} command="underline" title="Souligné" />
                <div className="w-px h-6 bg-white/10 mx-1" />
                <ToolbarButton icon={Heading1} command="formatBlock" value="H1" title="Titre 1" />
                <ToolbarButton icon={Heading2} command="formatBlock" value="H2" title="Titre 2" />
                <ToolbarButton icon={Heading3} command="formatBlock" value="H3" title="Titre 3" />
                <div className="w-px h-6 bg-white/10 mx-1" />
                <ToolbarButton icon={List} command="insertUnorderedList" title="Liste à puces" />
                <ToolbarButton icon={ListOrdered} command="insertOrderedList" title="Liste numérotée" />
                <div className="w-px h-6 bg-white/10 mx-1" />
                <ToolbarButton icon={AlignLeft} command="justifyLeft" title="Aligner à gauche" />
                <ToolbarButton icon={AlignCenter} command="justifyCenter" title="Centrer" />
                <ToolbarButton icon={AlignRight} command="justifyRight" title="Aligner à droite" />
                <div className="w-px h-6 bg-white/10 mx-1" />
                <ToolbarButton icon={Link} command="createLink" title="Lien" />
                <ToolbarButton icon={Image} command="insertImage" title="Image" />
            </div>

            {/* Editor Area */}
            <div
                ref={editorRef}
                className="flex-grow p-4 min-h-[300px] outline-none text-gray-200 prose prose-invert max-w-none"
                contentEditable
                onInput={(e) => onChange(e.currentTarget.innerHTML)}
                onBlur={() => {
                    setIsFocused(false);
                    if (editorRef.current) onChange(editorRef.current.innerHTML);
                }}
                onFocus={() => setIsFocused(true)}
                dangerouslySetInnerHTML={{ __html: content }}
                style={{ overflowY: 'auto' }}
            />
        </div>
    );
};

export default RichTextEditor;
