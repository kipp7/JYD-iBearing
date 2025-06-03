'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const ThreeDModelViewer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const isDraggingRef = useRef(false); // 👈 使用 ref 防止频繁更新状态

  useEffect(() => {
    const container = containerRef.current!;
    const scene = new THREE.Scene();

    // 相机
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // ✅ 鼠标交互控制是否自转
    const onMouseDown = () => (isDraggingRef.current = true);
    const onMouseUp = () => setTimeout(() => (isDraggingRef.current = false), 800); // 加一点缓冲
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    // 灯光
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // 加载模型
    const mtlLoader = new MTLLoader();
    mtlLoader.setPath('/models/');
    mtlLoader.load('model.mtl', (materials) => {
      materials.preload();

      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath('/models/');
      objLoader.load(
        'model.obj',
        (object) => {
          const box = new THREE.Box3().setFromObject(object);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);

          const scale = 5 / maxDim;
          object.scale.setScalar(scale);
          const newBox = new THREE.Box3().setFromObject(object);
          const newCenter = newBox.getCenter(new THREE.Vector3());
          object.position.sub(newCenter);

          const newSize = newBox.getSize(new THREE.Vector3());
          const newMax = Math.max(newSize.x, newSize.y, newSize.z);
          const fov = camera.fov * (Math.PI / 180);
          const distance = newMax / (2 * Math.tan(fov / 2));
          camera.position.set(0, 0, distance * 1.8);
          camera.lookAt(new THREE.Vector3(0, 0, 0));

          modelRef.current = object;
          scene.add(object);
          animate();
        },
        undefined,
        (error) => console.error('模型加载失败:', error)
      );
    });

    // 动画
    const animate = () => {
      requestAnimationFrame(animate);
      if (modelRef.current && !isDraggingRef.current) {
        modelRef.current.rotation.y += 0.001; // ✅ 更慢的旋转速度
      }
      controlsRef.current?.update();
      renderer.render(scene, cameraRef.current!);
    };

    // 自适应窗口
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // 清理
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);

      if (rendererRef.current) {
        rendererRef.current.dispose();
        const canvas = container.querySelector('canvas');
        if (canvas) container.removeChild(canvas);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black rounded-lg shadow-md relative"
    />
  );
};

export default ThreeDModelViewer;
