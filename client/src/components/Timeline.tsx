import { useEffect, useRef, useState } from 'react';

interface Props {
  years: number[];
  value: number;
  /**
   * 年份变化回调。
   * source 区分触发来源：'user'（滑块 / 刻度点击）需要写入浏览器历史，
   * 前进后退可逐年回溯；'play'（自动播放）只替换当前历史项，避免历史栈被刷屏。
   */
  onChange: (year: number, source: 'user' | 'play') => void;
  globalGdp?: number | null;
  /** 底部说明文案（探索页与画像页口径不同） */
  hint?: string;
}

export default function Timeline({ years, value, onChange, globalGdp, hint }: Props) {
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);
  const idx = Math.max(0, years.indexOf(value));

  useEffect(() => {
    if (playing) {
      timer.current = window.setInterval(() => {
        const i = years.indexOf(value);
        if (i >= years.length - 1) {
          setPlaying(false);
        } else {
          onChange(years[i + 1], 'play');
        }
      }, 1600);
    }
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, value]);

  const togglePlay = () => {
    if (!playing && idx >= years.length - 1) onChange(years[0], 'play');
    setPlaying((p) => !p);
  };

  const fillPct = (idx / (years.length - 1)) * 100;

  return (
    <div className="timeline-bar">
      <div className="timeline-top">
        <button className="play-btn" onClick={togglePlay} title={playing ? '暂停' : '播放'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="timeline-year">
          {value}
          {globalGdp != null && (
            <small>
              收录经济体 GDP 合计 ${(globalGdp / 1e12).toFixed(1)} 万亿
            </small>
          )}
        </div>
        <div className="timeline-range">
          <input
            className="year-slider"
            type="range"
            min={0}
            max={years.length - 1}
            step={1}
            value={idx}
            style={{ ['--fill' as string]: `${fillPct}%` }}
            onChange={(e) => {
              setPlaying(false);
              onChange(years[Number(e.target.value)], 'user');
            }}
          />
          <div className="timeline-ticks">
            {years.map((y) => (
              <button
                key={y}
                className={`tick ${y === value ? 'active' : ''}`}
                onClick={() => {
                  setPlaying(false);
                  onChange(y, 'user');
                }}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="timeline-hint">{hint ?? '拖动或播放时间轴，观察全球经济重心的迁移与贸易网络的扩张'}</div>
    </div>
  );
}
