import ExperimentCard from "../components/ExperimentCard";

const experiments = [
  {
    title: "Wait Calculator",
    description:
      "An interstellar travel simulator based on Andrew Kennedy's 2006 insight — because propulsion technology improves over time, waiting to launch may get you there faster.",
    tag: "Physics Simulation",
    link: "/experiments/wait-calculator",
  },
  {
    title: "Outbreak",
    description:
      "Watch a pathogen move through a population in real time. Configure transmission, immunity, and quarantine behavior — then let 1,000 individuals find their own fate.",
    tag: "Agent-Based Model",
    link: "/experiments/outbreak",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <p className="text-green-400 font-mono text-sm tracking-widest uppercase mb-3">
            diego92dlpt
          </p>
          <h1 className="text-4xl font-bold mb-4">Interactive Lab</h1>
          <p className="text-gray-400 text-lg">
            A collection of simulations, tools, and experiments.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {experiments.map((exp) => (
            <ExperimentCard key={exp.title} {...exp} />
          ))}
        </div>
      </div>
    </div>
  );
}