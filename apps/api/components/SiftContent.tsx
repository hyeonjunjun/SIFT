'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function SiftContent({ content }: { content: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                h1: ({ node, ...props }) => <h1 className="text-3xl font-serif font-bold text-ink mt-8 mb-4 border-b border-separator pb-2" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-2xl font-serif font-bold text-ink mt-8 mb-4" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-xl font-serif font-bold text-ink mt-6 mb-3" {...props} />,
                p: ({ node, ...props }) => <p className="text-base text-ink leading-relaxed mb-4" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-2 mb-4 text-ink" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-2 mb-4 text-ink" {...props} />,
                li: ({ node, ...props }) => <li className="text-base" {...props} />,
                a: ({ node, ...props }) => <a className="text-accent hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-separator pl-4 italic text-stone my-4" {...props} />,
                code: ({ node, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match && !className?.includes('language-');
                    return isInline ? (
                        <code className="bg-subtle text-ink px-1.5 py-0.5 rounded-md text-sm font-mono" {...props}>
                            {children}
                        </code>
                    ) : (
                        <div className="bg-[#1e1e1e] rounded-xl overflow-hidden my-4 border border-separator/30 shadow-sm">
                            <div className="bg-[#2d2d2d] px-4 py-2 text-xs font-mono text-stone border-b border-[#3d3d3d]">
                                {match?.[1] || 'code'}
                            </div>
                            <pre className="p-4 overflow-x-auto">
                                <code className={`text-sm font-mono text-paper ${className || ''}`} {...props}>
                                    {children}
                                </code>
                            </pre>
                        </div>
                    );
                },
            }}
        >
            {content}
        </ReactMarkdown>
    );
}
