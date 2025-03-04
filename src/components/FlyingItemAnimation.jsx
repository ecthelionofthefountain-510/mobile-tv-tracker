import React, { useState, useEffect } from "react";
import { IMAGE_BASE_URL } from "../config";

const FlyingItemAnimation = ({ 
  item, 
  targetType, 
  onComplete, 
  startPosition 
}) => {
  const [position, setPosition] = useState(startPosition || { x: window.innerWidth / 2, y: window.innerHeight / 3 });
  const [dimensions, setDimensions] = useState({ width: 60, height: 90 });
  const [opacity, setOpacity] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Hårdkodade målkoordinater som fallback (botten av skärmen)
  const getDefaultTarget = () => {
    // Placera målet längst ner i mitten för movies, vänster för tv, höger för favorites
    const y = window.innerHeight - 30; // Strax ovanför botten av skärmen
    
    let x;
    if (targetType === 'movie') {
      x = window.innerWidth * 0.5; // Mitten
    } else if (targetType === 'tv') {
      x = window.innerWidth * 0.25; // En fjärdedel in från vänster
    } else if (targetType === 'favorite') {
      x = window.innerWidth * 0.75; // Tre fjärdedelar in från vänster
    } else {
      x = window.innerWidth * 0.5; // Fallback till mitten
    }
    
    return { x, y };
  };
  
  useEffect(() => {
    if (!isAnimating) {
      // Starta animationen omedelbart
      setIsAnimating(true);
      
      // Bestäm målikonen baserat på typ
      let targetSelector;
      
      if (targetType === 'movie') {
        targetSelector = 'a[href="/movies"]';
      } else if (targetType === 'tv') {
        targetSelector = 'a[href="/shows"]';
      } else if (targetType === 'favorite') {
        targetSelector = 'a[href="/favorites"]';
      }
      
      console.log("Animerar till:", targetSelector);
      
      const targetElement = document.querySelector(targetSelector);
      
      // Beräkna målposition, med fallback
      let targetPosition;
      
      if (targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        targetPosition = {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2
        };
      } else {
        console.log("Hittade inte målelementet, använder fallback-position");
        targetPosition = getDefaultTarget();
      }
      
      console.log("Startposition:", position);
      console.log("Målposition:", targetPosition);
      
      // Animationskonfiguration
      const duration = 800; // 800ms för hela animationen
      const startTime = Date.now();
      
      const animate = () => {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // Easing function för mjukare animation
        const easeOutQuad = t => t * (2 - t);
        const easedProgress = easeOutQuad(progress);
        
        // Uppdatera position
        const newX = position.x + (targetPosition.x - position.x) * easedProgress;
        const newY = position.y + (targetPosition.y - position.y) * easedProgress;
        
        // Lägg till en vågig stig - lite mer påtaglig
        const newRotation = Math.sin(progress * Math.PI * 4) * 25;
        
        // Uppdatera storlek (bli mindre när den närmar sig målet)
        const newScale = 1 - (0.8 * easedProgress);
        
        // Uppdatera opacity (fadea ut en aning när den närmar sig)
        const newOpacity = 1 - (0.2 * Math.pow(easedProgress, 2));
        
        setPosition({ x: newX, y: newY });
        setRotation(newRotation);
        setScale(newScale);
        setOpacity(newOpacity);
        
        if (progress >= 1) {
          // Slutanimation - liten "pop" när den kommer fram
          setScale(0.3);
          setOpacity(0.9);
          
          setTimeout(() => {
            setScale(0);
            setOpacity(0);
            
            // Färdig - notifiera förälder
            setTimeout(() => {
              onComplete();
            }, 300);
          }, 100);
        } else {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [isAnimating, targetType, position, onComplete]);
  
  return (
    <div 
      className="fixed pointer-events-none z-50"
      style={{
        left: `${position.x - dimensions.width / 2}px`,
        top: `${position.y - dimensions.height / 2}px`,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        opacity: opacity,
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        transition: 'transform 0.05s ease-out',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        borderRadius: '6px',
        overflow: 'hidden',
        border: '2px solid rgba(255, 215, 0, 0.8)'
      }}
    >
      {item && item.poster_path ? (
        <img 
          src={`${IMAGE_BASE_URL}${item.poster_path}`} 
          alt={item?.title || "Item"}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-yellow-500 text-xs">
          {item?.title?.substring(0,15) || "Item"}
        </div>
      )}
    </div>
  );
};

export default FlyingItemAnimation;