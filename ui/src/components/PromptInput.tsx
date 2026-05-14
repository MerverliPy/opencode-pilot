/**
 * PromptInput: auto-growing textarea with submit button.
 */
import { useState, useRef, useCallback } from "react";
import { colors, fonts, fontSizes } from "../theme";

type Props = {
  onSubmit: (text: string) => void | Promise<void>;
  disabled?: boolean;
};

export function PromptInput({ onSubmit, disabled }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(async () => {
    const v = text.trim();
    if (!v || disabled) return;
    setText("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await onSubmit(v);
  }, [text, disabled, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-grow
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div
      style={{
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.surface,
        padding: "10px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        <span
          style={{
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.md,
            lineHeight: "22px",
            paddingBottom: 6,
            userSelect: "none",
          }}
        >
          {">"}
        </span>
        <textarea
          data-testid="prompt-input"
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="ask opencode…"
          rows={1}
          style={{
            flex: 1,
            backgroundColor: "transparent",
            border: "none",
            color: colors.text,
            fontFamily: fonts.mono,
            fontSize: fontSizes.md,
            lineHeight: 1.45,
            resize: "none",
            outline: "none",
            minHeight: 22,
            maxHeight: 160,
            padding: 0,
            margin: 0,
          }}
        />
        <button
          onClick={() => void submit()}
          disabled={disabled || !text.trim()}
          style={{
            backgroundColor:
              disabled || !text.trim() ? colors.border : colors.accent,
            color: disabled || !text.trim() ? colors.muted : "#000",
            border: "none",
            borderRadius: 6,
            padding: "6px 14px",
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
            cursor: disabled || !text.trim() ? "not-allowed" : "pointer",
            opacity: disabled || !text.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
