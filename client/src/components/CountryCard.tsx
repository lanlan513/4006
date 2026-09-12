import { Link } from 'react-router-dom';
import type { CountryListItem } from '../api';
import { regionName } from '../api';
import { fmtDollars, fmtGrowth, fmtPercent, fmtPopulation } from '../format';
import PyramidChart from './PyramidChart';

interface Props {
  country: CountryListItem;
  year: number;
  onClose: () => void;
  onFocusNetwork: () => void;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="stat-cell">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone ?? ''}`}>{value}</div>
    </div>
  );
}

export default function CountryCard({ country, year, onClose, onFocusNetwork }: Props) {
  const growthTone = (country.gdpGrowth ?? 0) >= 0 ? 'up' : 'down';
  const popTone = (country.popGrowth ?? 0) >= 0 ? 'up' : 'down';

  return (
    <div className="overlay country-card">
      <button className="card-close" onClick={onClose} title="关闭">
        ✕
      </button>
      <span className="card-region">{regionName(country.region)}</span>
      <div className="card-name">{country.name}</div>
      <div className="card-year">{year} 年经济概览</div>

      <div className="stat-grid">
        <Stat label="名义 GDP" value={fmtDollars(country.gdp)} />
        <Stat label="GDP 增速" value={fmtGrowth(country.gdpGrowth)} tone={growthTone} />
        <Stat label="人均 GDP" value={fmtDollars(country.gdpPerCapita)} />
        <Stat label="人口" value={fmtPopulation(country.population)} />
        <Stat label="出口额" value={fmtDollars(country.exports)} />
        <Stat label="进口额" value={fmtDollars(country.imports)} />
      </div>

      <div className="card-section-title">人口数据 · {year}</div>
      <div className="stat-grid">
        <Stat label="总人口" value={fmtPopulation(country.population)} />
        <Stat label="人口增长率" value={fmtGrowth(country.popGrowth)} tone={popTone} />
        <Stat label="老龄化率（65+）" value={fmtPercent(country.agingRate)} />
        <Stat label="城市化率" value={fmtPercent(country.urbanRate)} />
        <Stat label="劳动力规模" value={fmtPopulation(country.laborForce)} />
      </div>

      {country.youthRate != null && country.agingRate != null && (
        <>
          <div className="card-section-title">人口年龄结构 · {year}</div>
          <PyramidChart
            youth={country.youthRate}
            working={Math.max(0, 100 - country.youthRate - country.agingRate)}
            aging={country.agingRate}
            height={132}
            compact
          />
        </>
      )}

      <div className="card-actions">
        <Link to={`/country/${country.code}`} className="btn-primary">
          进入经济画像 <span className="arrow">→</span>
        </Link>
        <button className="btn-ghost" onClick={onFocusNetwork}>
          聚焦其贸易网络 <span className="arrow">↗</span>
        </button>
      </div>
    </div>
  );
}
