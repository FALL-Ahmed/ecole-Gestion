import React from "react";
import { motion } from "framer-motion";

const Particles = ({ className }: { className?: string }) => {
  return (
    <div className={className}>
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            opacity: 0,
            x: Math.random() * 100,
            y: Math.random() * 100,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{
            opacity: [0, 0.3, 0],
            x: [0, Math.random() * 200 - 100],
            y: [0, Math.random() * 200 - 100]
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            repeatType: "loop",
            delay: Math.random() * 5
          }}
          className="absolute rounded-full bg-blue-300/20"
          style={{
            width: `${Math.random() * 5 + 1}px`,
            height: `${Math.random() * 5 + 1}px`
          }}
        />
      ))}
    </div>
  );
};

export default Particles;