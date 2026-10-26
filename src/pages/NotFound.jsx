import { Link } from 'react-router-dom'
import { Empty } from '../components/States'

export default function NotFound() {
  return (
    <div className="container page">
      <Empty icon="🏚️" title="404 — Хуудас олдсонгүй" text="Энэ танхим музейд байхгүй байна.">
        <Link to="/" className="btn btn-primary">Нүүр хуудас</Link>
      </Empty>
    </div>
  )
}
