import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Explore from './pages/Explore';
import CountryProfile from './pages/CountryProfile';
import ChainPage from './pages/ChainPage';
import ResourcePage from './pages/ResourcePage';

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
          to="/chain/oil"
          className={`nav-link ${pathname.startsWith('/chain') ? 'active' : ''}`}
        >
          全球产业链
        </Link>
        <Link
          to="/resources"
          className={`nav-link ${pathname.startsWith('/resources') ? 'active' : ''}`}
        >
          全球资源地图
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
        <Route path="/chain/:id" element={<ChainPage />} />
        <Route path="/resources" element={<Navigate to="/resources/oil" replace />} />
        <Route path="/resources/:id" element={<ResourcePage />} />
      </Routes>
    </>
  );
}
