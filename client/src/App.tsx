import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Explore from './pages/Explore';
import CountryProfile from './pages/CountryProfile';
import ChainPage from './pages/ChainPage';
import ChainIndex from './pages/ChainIndex';

function Header() {
  const { pathname } = useLocation();
  return (
    <header className="app-header">
      <Link to="/" className="brand">
        <span className="brand-mark">
          全球经济图谱 <em>·</em> ATLAS
        </span>
        <span className="brand-sub">Global Economy Atlas</span>
      </Link>
      <nav className="nav-links">
        <Link to="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
          探索地图
        </Link>
        <Link
          to="/chain"
          className={`nav-link ${pathname.startsWith('/chain') ? 'active' : ''}`}
        >
          全球产业链
        </Link>
      </nav>
      <span className="header-note">数据口径：世界银行 / IMF / WTO 公开数据整理 · MVP 示例数据集</span>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Explore />} />
        <Route path="/country/:code" element={<CountryProfile />} />
        <Route path="/chain" element={<ChainIndex />} />
        <Route path="/chain/:id" element={<ChainPage />} />
      </Routes>
    </>
  );
}
