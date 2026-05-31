import { ExternalLink } from "lucide-react";
import type { SearchResult } from "../core/types";

interface ResultCardsProps {
  notes: SearchResult[];
  onOpenNote: (path: string) => void;
}

export function ResultCards({ notes, onOpenNote }: ResultCardsProps) {
  if (notes.length === 0) {
    return <div className="popup-empty">暂无相关笔记。</div>;
  }

  return (
    <div className="result-cards">
      {notes.map((note) => (
        <article className="popup-card" key={note.documentId}>
          <div className="popup-card-header">
            <div>
              <h3>{note.title}</h3>
              <p className="popup-card-path">{note.path}</p>
            </div>
            <button
              className="popup-open-btn"
              type="button"
              onClick={() => onOpenNote(note.path)}
              aria-label={`打开 ${note.title}`}
            >
              <ExternalLink size={16} />
            </button>
          </div>
          <p className="popup-snippet" dangerouslySetInnerHTML={{ __html: note.snippet }} />
          <div className="popup-chips">
            {note.reasons.map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
