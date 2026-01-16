import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseFileLinkUrl } from "../../../utils/fileLinks";
import { remarkFileLinks } from "../../../utils/remarkFileLinks";

type MarkdownProps = {
  value: string;
  className?: string;
  codeBlock?: boolean;
  onOpenFileLink?: (
    path: string,
    line?: number | null,
    column?: number | null,
  ) => void;
};

export function Markdown({
  value,
  className,
  codeBlock,
  onOpenFileLink,
}: MarkdownProps) {
  const content = codeBlock ? `\`\`\`\n${value}\n\`\`\`` : value;
  const remarkPlugins = onOpenFileLink
    ? [remarkGfm, remarkFileLinks]
    : [remarkGfm];
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={
          onOpenFileLink
            ? {
                a: ({ href, children, ...props }) => {
                  const target = href ? parseFileLinkUrl(href) : null;
                  if (target) {
                    return (
                      <a
                        href={href}
                        {...props}
                        onClick={(event) => {
                          event.preventDefault();
                          onOpenFileLink(target.path, target.line, target.column);
                        }}
                      >
                        {children}
                      </a>
                    );
                  }
                  return (
                    <a href={href} {...props}>
                      {children}
                    </a>
                  );
                },
              }
            : undefined
        }
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
