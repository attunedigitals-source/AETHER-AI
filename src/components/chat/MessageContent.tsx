import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { CodeBlock } from './CodeBlock';

interface MessageContentProps {
  content: string;
}

export const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  return (
    <div className="prose prose-warm dark:prose-invert max-w-none break-words text-[15px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (match || codeString.includes('\n'))) {
              return <CodeBlock language={match ? match[1] : ''} code={codeString} />;
            }

            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-warm-150 dark:bg-warm-850 font-mono text-[13px] text-claude-coral font-medium border border-warm-200 dark:border-warm-800"
                {...props}
              >
                {children}
              </code>
            );
          },
          table({ children }: any) {
            return (
              <div className="my-4 overflow-x-auto rounded-xl border border-warm-200 dark:border-warm-800 shadow-sm">
                <table className="w-full text-left text-sm border-collapse">{children}</table>
              </div>
            );
          },
          thead({ children }: any) {
            return <thead className="bg-warm-100 dark:bg-warm-850 border-b border-warm-200 dark:border-warm-800 text-warm-700 dark:text-warm-300 font-semibold">{children}</thead>;
          },
          th({ children }: any) {
            return <th className="px-4 py-2.5 font-medium">{children}</th>;
          },
          td({ children }: any) {
            return <td className="px-4 py-2 border-b border-warm-150 dark:border-warm-850">{children}</td>;
          },
          blockquote({ children }: any) {
            return (
              <blockquote className="my-3 pl-4 border-l-2 border-claude-coral/70 italic text-warm-700 dark:text-warm-300">
                {children}
              </blockquote>
            );
          },
          a({ href, children }: any) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-claude-coral hover:underline font-medium decoration-claude-coral/50"
              >
                {children}
              </a>
            );
          },
          ul({ children }: any) {
            return <ul className="my-2.5 list-disc pl-5 space-y-1">{children}</ul>;
          },
          ol({ children }: any) {
            return <ol className="my-2.5 list-decimal pl-5 space-y-1">{children}</ol>;
          },
          p({ children }: any) {
            return <p className="mb-3 last:mb-0">{children}</p>;
          },
          h1({ children }: any) {
            return <h1 className="text-2xl font-serif font-semibold mt-6 mb-3 text-warm-900 dark:text-warm-50">{children}</h1>;
          },
          h2({ children }: any) {
            return <h2 className="text-xl font-serif font-semibold mt-5 mb-2.5 text-warm-900 dark:text-warm-50">{children}</h2>;
          },
          h3({ children }: any) {
            return <h3 className="text-lg font-serif font-semibold mt-4 mb-2 text-warm-900 dark:text-warm-50">{children}</h3>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

