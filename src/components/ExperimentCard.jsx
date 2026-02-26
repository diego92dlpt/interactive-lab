export default function ExperimentCard({ title, description, tag, link }) {
  return (
    <a
      href={link}
      className="block bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-400 transition-colors duration-200 no-underline"
    >
      <span className="text-xs font-mono text-green-400 tracking-widest uppercase">
        {tag}
      </span>
      <h2 className="text-white text-xl font-bold mt-2 mb-2">{title}</h2>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </a>
  );
}