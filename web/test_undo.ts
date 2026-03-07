import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';

const doc = new Y.Doc();
const editor = new Editor({
    extensions: [
        StarterKit.configure({
            history: false,
            undo: false,
            redo: false
        } as any),
        Collaboration.configure({
            document: doc
        })
    ]
});

console.log("Can undo?", editor.can().undo());
console.log("Commands available:", Object.keys(editor.commands));
