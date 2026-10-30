import React, { useRef, useEffect, useState } from 'react';
import { Undo2, Trash2 } from 'lucide-react';

interface DrawingCanvasProps {
  isDrawer: boolean;
  onStroke?: (stroke: any) => void;
  onClear?: () => void;
  onUndo?: () => void;
  drawingData?: any[];
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  isDrawer,
  onStroke,
  onClear,
  onUndo,
  drawingData = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    if (drawingData.length === 0) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    redrawCanvas();
  }, [drawingData]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawingData.forEach(stroke => {
      drawStroke(ctx, stroke);
    });
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: any) => {
    ctx.strokeStyle = stroke.isEraser ? 'white' : stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = stroke.isEraser ? 'destination-out' : 'source-over';

    ctx.beginPath();
    ctx.moveTo(stroke.x - stroke.size / 2, stroke.y - stroke.size / 2);
    ctx.lineTo(stroke.x, stroke.y);
    ctx.stroke();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDrawer) return;
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !isDrawer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const stroke = {
      x,
      y,
      color,
      size,
      isEraser,
    };

    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawStroke(ctx, stroke);
    }

    onStroke?.(stroke);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isDrawer) return;
    setIsDrawing(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing || !isDrawer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const stroke = {
      x,
      y,
      color,
      size,
      isEraser,
    };

    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawStroke(ctx, stroke);
    }

    onStroke?.(stroke);
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`border-2 border-gray-300 rounded-lg bg-white w-full ${
          isDrawer ? 'cursor-crosshair' : 'cursor-not-allowed'
        }`}
        style={{ minHeight: '400px' }}
      />

      {isDrawer && (
        <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg">
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium">Color:</label>
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer"
              disabled={isEraser}
            />
          </div>

          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium">Size:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={size}
              onChange={e => setSize(Number(e.target.value))}
              className="w-24"
              disabled={isEraser}
            />
            <span className="text-sm">{size}px</span>
          </div>

          <button
            onClick={() => {
              setIsEraser(!isEraser);
              setColor(isEraser ? '#000000' : '#ffffff');
            }}
            className={`px-3 py-2 rounded font-medium text-sm ${
              isEraser ? 'bg-red-500 text-white' : 'bg-gray-200'
            }`}
          >
            {isEraser ? 'Eraser On' : 'Eraser'}
          </button>

          <button
            onClick={() => onUndo?.()}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded font-medium text-sm hover:bg-blue-600"
          >
            <Undo2 size={16} />
            Undo
          </button>

          <button
            onClick={() => onClear?.()}
            className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded font-medium text-sm hover:bg-red-600"
          >
            <Trash2 size={16} />
            Clear
          </button>
        </div>
      )}
    </div>
  );
};
