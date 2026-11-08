import React, { useState, useEffect } from "react"; // 1. Make sure useEffect is imported
import EastOutlinedIcon from "@mui/icons-material/EastOutlined";
import WestOutlinedIcon from "@mui/icons-material/WestOutlined";
import "./Slider.scss";

const Slider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const data = [
    "/img/modern3.jpg",
    "/img/modern1.jpg",
    "/img/modern2.webp",
    "/img/modern4.jpg",
    "/img/modern 5.jpg",
    "/img/modern6.jpg",
    "/img/modern7.jpg",
    "/img/modern8.jpg",
    "/img/modern9.webp",

  ];

  const prevSlide = () => {
    setCurrentSlide(currentSlide === 0 ? data.length - 1 : (prev) => prev - 1);
  };
  const nextSlide = () => {
    setCurrentSlide(currentSlide === data.length - 1 ? 0 : (prev) => prev + 1);
  };

  // 2. Add this useEffect hook for the automatic slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 3500); // Change slides every 5 seconds

    // 3. Clean up the interval when the component unmounts
    return () => clearInterval(interval);
  }, [currentSlide]); // We add currentSlide as a dependency to reset the interval on manual navigation

  return (
    <div className="slider">
      <div
        className="container"
        style={{ transform: `translateX(-${currentSlide * 100}vw)` }}
      >
        {data.map((src, index) => (
          <img src={src} key={index} alt={`Slide ${index + 1}`} />
        ))}
      </div>
      <div className="icons">
        <div className="icon" onClick={prevSlide}>
          <WestOutlinedIcon />
        </div>
        <div className="icon" onClick={nextSlide}>
          <EastOutlinedIcon />
        </div>
      </div>
    </div>
  );
};

export default Slider;