import { useState } from 'react';
import type { TwinPair } from '../../types';

interface TwinConfigProps {
  pair: TwinPair;
  onSave: (updates: Partial<TwinPair>) => void;
}

const EMOJI_OPTIONS = ['👶', '👧', '👦', '🧒', '👼', '🐣', '🌟', '💙', '💖'];
const COLOR_OPTIONS = ['#6C9BFF', '#FF8FA4', '#4ADE80', '#FBBF24', '#A78BFA', '#F97316', '#06B6D4', '#EC4899'];

export function TwinConfig({ pair, onSave }: TwinConfigProps) {
  const [nameA, setNameA] = useState(pair.twin_a_name);
  const [nameB, setNameB] = useState(pair.twin_b_name);
  const [colorA, setColorA] = useState(pair.twin_a_color);
  const [colorB, setColorB] = useState(pair.twin_b_color);
  const [emojiA, setEmojiA] = useState(pair.twin_a_emoji);
  const [emojiB, setEmojiB] = useState(pair.twin_b_emoji);

  function handleSave() {
    onSave({
      twin_a_name: nameA,
      twin_b_name: nameB,
      twin_a_color: colorA,
      twin_b_color: colorB,
      twin_a_emoji: emojiA,
      twin_b_emoji: emojiB,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Twin A */}
      <TwinSection
        label="Twin A"
        color={colorA}
        name={nameA}
        emoji={emojiA}
        onNameChange={setNameA}
        onColorChange={setColorA}
        onEmojiChange={setEmojiA}
      />

      <div className="border-t border-white/5" />

      {/* Twin B */}
      <TwinSection
        label="Twin B"
        color={colorB}
        name={nameB}
        emoji={emojiB}
        onNameChange={setNameB}
        onColorChange={setColorB}
        onEmojiChange={setEmojiB}
      />

      <button
        onClick={handleSave}
        className="min-h-[48px] rounded-xl bg-text-primary text-bg-primary font-semibold text-sm
                   active:scale-95 transition-all"
      >
        Save Changes
      </button>
    </div>
  );
}

function TwinSection({
  label,
  color,
  name,
  emoji,
  onNameChange,
  onColorChange,
  onEmojiChange,
}: {
  label: string;
  color: string;
  name: string;
  emoji: string;
  onNameChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onEmojiChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold" style={{ color }}>{label}</h3>

      {/* Name */}
      <div>
        <label className="text-xs text-text-muted mb-1 block">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full min-h-[44px] px-3 rounded-lg bg-white/5 text-text-primary text-sm
                     border border-white/10 focus:outline-none focus:border-white/20"
        />
      </div>

      {/* Emoji */}
      <div>
        <label className="text-xs text-text-muted mb-1 block">Emoji</label>
        <div className="flex gap-2 flex-wrap">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              onClick={() => onEmojiChange(e)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all
                ${emoji === e ? 'bg-white/15 ring-2 ring-white/20' : 'bg-white/5 hover:bg-white/10'}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="text-xs text-text-muted mb-1 block">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              className={`w-8 h-8 rounded-full transition-all ${
                color === c ? 'ring-2 ring-white/40 scale-110' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
