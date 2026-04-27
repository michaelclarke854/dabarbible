import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUpView } from "@/lib/motionVariants";
import { trackEvent } from "@/lib/trackEvent";

const SECTIONS = [
  {
    title: "Scripture",
    body:
      "We believe the Bible is the inspired, authoritative Word of God — sufficient for faith, life, and spiritual formation. DABAR is grounded in scripture because we believe the Word itself is where God meets people who are seeking.",
  },
  {
    title: "Faith",
    body:
      "We hold to the historic Christian faith: salvation by grace through faith in Jesus Christ, the triune nature of God, the resurrection, and the ongoing work of the Holy Spirit. We are evangelically rooted and denominationally neutral — DABAR serves believers across the full range of the church.",
  },
  {
    title: "How DABAR's AI works",
    body:
      "DABAR uses AI to assist with scripture reflection. Our AI draws from the Bible to offer reflection prompts, relevant passages, and questions for further meditation. AI responses are reflection aids — not pastoral counsel, not infallible interpretation, and not a substitute for your own reading of scripture, your church community, or your pastor. Every response should be weighed against the Bible itself.",
  },
  {
    title: "What DABAR is not",
    body:
      "DABAR is not a pastor replacement. It does not have authority over your spiritual life. It does not claim to speak for God. It is a digital tool — one you should use with discernment, alongside scripture, community, and prayer.",
  },
  {
    title: "When something seems wrong",
    body:
      "Every AI response can be flagged. If something seems theologically inaccurate, we want to know. Tap the flag, note the issue, and we will review it. We take theological accuracy seriously.",
  },
];

export default function DoctrinePage() {
  useEffect(() => {
    trackEvent("doctrine_page_viewed", { screen: "doctrine" });
  }, []);

  return (
    <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <Link
        to="/"
        className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
      >
        ← Back
      </Link>

      <motion.div {...fadeUpView(0)} className="text-center mb-12">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground tracking-wide mb-3">
          What We Believe
        </h1>
        <p className="font-body text-sm text-muted-foreground tracking-wide">
          Doctrinal statement &amp; AI disclosure
        </p>
        <div className="w-12 h-px bg-gold mx-auto mt-6" />
      </motion.div>

      <div className="space-y-10">
        {SECTIONS.map((section, i) => (
          <motion.section
            key={section.title}
            {...fadeUpView(0.05 + i * 0.08)}
          >
            <h2 className="font-serif text-xl text-gold tracking-wide mb-3">
              {section.title}
            </h2>
            <p className="font-body text-base text-foreground/85 leading-relaxed">
              {section.body}
            </p>
          </motion.section>
        ))}
      </div>

      <div className="w-12 h-px bg-gold mx-auto mt-16 mb-6" />
      <p className="font-body text-xs text-muted-foreground text-center">
        Questions? Contact{" "}
        <a
          href="mailto:mike@dabarbible.com"
          className="text-gold hover:underline"
        >
          mike@dabarbible.com
        </a>
      </p>
    </div>
  );
}