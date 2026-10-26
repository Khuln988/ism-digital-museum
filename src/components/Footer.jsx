import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <div className="footer-title">ISM Digital Museum</div>
          <p>Мэдээллийн Системийн Менежментийн тэнхимийн түүх, багш нар, арга хэмжээ, оюутны бүтээлийг нэг дор.</p>
        </div>
        <div className="footer-links">
          <Link to="/exhibits">Үзмэрүүд</Link>
          <Link to="/virtual">Виртуал үзэсгэлэн</Link>
          <Link to="/teachers">Багш нар</Link>
          <Link to="/events">Арга хэмжээ</Link>
        </div>
      </div>
      <div className="container footer-bottom">© {new Date().getFullYear()} СЭЗИС · Мэдээллийн Системийн Менежментийн Тэнхим</div>
    </footer>
  )
}
