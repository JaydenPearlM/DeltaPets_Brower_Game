import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./Markdown.css";

type Props = {
  content: string;
  className?: string;
};

export function MarkdownBody({ content, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content ?? ""}</ReactMarkdown>
    </div>
  );
}
