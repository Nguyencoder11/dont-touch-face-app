import React, { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler'
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as mobilenet from '@tensorflow-models/mobilenet'
import * as knnClassifier from '@tensorflow-models/knn-classifier'
import { initNotifications, notify } from '@mycv/f8-notification';

import soundUrl from './assets/sound.mp3'
import './App.css';


/* ================== CONSTANTS ================== */
const NOT_TOUCH_LABEL = 'not_touch'
const TOUCH_LABEL = 'touched'
const TRAINING_TIMES = 50
const TOUCHED_CONFIDENCE = 0.8

/* ================== SOUND ================== */
const sound = new Howl({ src: [soundUrl] })

function App() {
  /* ================== REFS ================== */
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const classifierRef = useRef(null)
  const mobilenetRef = useRef(null)
  const canPlaySound = useRef(true)
  const isRunning = useRef(false)
  const isTabActive = useRef(true)

  /* ================== STATE ================== */
  const [ready, setReady] = useState(false)
  const [touched, setTouched] = useState(false)
  const [trainingLabel, setTrainingLabel] = useState(null)
  const [trainProgress, setTrainProgress] = useState(0)

  /* ================== CAMERA ================== */
  const setupCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    videoRef.current.srcObject = stream
    streamRef.current = stream

    return new Promise(resolve => {
      videoRef.current.onloadedmetadata = resolve
    })
  }

  /* ================== INIT ================== */
  const init = async () => {
    console.log('init...');
    await setupCamera()
    console.log('Set up camera successfully');

    await tf.setBackend('webgl');
    await tf.ready();
    console.log('Current backend:', tf.getBackend());

    classifierRef.current = knnClassifier.create()
    mobilenetRef.current = await mobilenet.load()

    initNotifications({ cooldown: 3000 })

    setReady(true)
    console.log('✅ System ready')
  }

  /* ================== UTILS ================== */
  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  const getEmbedding = () =>
    tf.tidy(() =>
      mobilenetRef.current.infer(videoRef.current, true)
    )

  /* ================== TRAIN ================== */
  const train = async (label) => {
    if (!ready) return

    setTrainingLabel(label)
    setTrainProgress(0)

    for (let i = 0; i < TRAINING_TIMES; i++) {
      const embedding = getEmbedding()
      classifierRef.current.addExample(embedding, label)

      const progress = Math.round(((i + 1) / TRAINING_TIMES) * 100)
      setTrainProgress(progress)

      await sleep(50)
    }

    setTrainingLabel(null)
    console.log(`✅ Trained: ${label}`)
  }

  /* ================== RUN LOOP ================== */
  const run = async () => {
    if (!ready || isRunning.current) return

    isRunning.current = true

    const loop = async () => {
      if (!isRunning.current) return

      const embedding = getEmbedding()
      const result = await classifierRef.current.predictClass(embedding)

      const confidence = result.confidences[result.label] || 0

      if (result.label === TOUCH_LABEL && confidence > TOUCHED_CONFIDENCE) {
        if (canPlaySound.current) {
          canPlaySound.current = true
          if (isTabActive.current) {
            sound.play()
          }
        }

        notify('Bỏ tay ra!', {
          body: 'Bạn vừa chạm tay lên mặt'
        })

        setTouched(true)
      } else {
        setTouched(false)
      }

      requestAnimationFrame(loop)
    }

    loop()
  }

  /* ================== EFFECT ================== */
  useEffect(() => {
    init()

    sound.on('end', function () {
      canPlaySound.current = true
      console.log('Finished!');
    })

    // clean up
    return () => {
      isRunning.current = false

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }

      sound.unload()
      tf.disposeVariables()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handleVisibility = () => {
      isTabActive.current = !document.hidden
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <video
        ref={videoRef}
        className='video'
        autoPlay
        playsInline>
      </video>

      <div className='control'>
        <button className='btn' disabled={!ready} onClick={() => { train(NOT_TOUCH_LABEL) }}>Train 1 (No Touch)</button>
        <button className='btn' disabled={!ready} onClick={() => { train(TOUCH_LABEL) }}>Train 2 (Touch)</button>
        <button className='btn' disabled={!ready} onClick={() => { run() }}>Run</button>
      </div>

      {trainingLabel && (
        <div className='training-status'>
          Training <b>{trainingLabel}</b>: {trainProgress}%
        </div>)}
    </div>
  );
}

export default App;
