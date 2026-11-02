// Plain text in, paragraphs out. Rendered as text nodes, never as HTML.
export function Paragraphs({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter((block) => block.trim())
  return (
    <div className="prose-entry">
      {blocks.map((block, index) => (
        <p key={index} className="whitespace-pre-line">
          {block.trim()}
        </p>
      ))}
    </div>
  )
}
