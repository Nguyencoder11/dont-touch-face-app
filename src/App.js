import React, { useEffect, useRef } from 'react';
import logo from './logo.svg';
import { Howl, Howler } from 'howler'
import * as mobilenet from '@tensorflow-models/mobilenet'
import * as knnClassifier from '@tensorflow-models/knn-classifier'
import './App.css';
import soundUrl from './assets/sound.mp3'

var sound = new Howl({
  src: [soundUrl]
})

// sound.play()

const NOT_TOUCH_LABEL = 'not_touch'
const TOUCH_LABEL = 'touched'
const TRAINING_TIMES = 50

function App() {
  const video = useRef()
  const classifier = useRef()
  const mobilenetModule = useRef()

  const init = async () => {
    console.log('init...');

    await setupCamera()

    console.log('Set up camera successfully');

    classifier.current = knnClassifier.create()

    mobilenetModule.current = await mobilenet.load()

    console.log('Set up done');
    console.log('Give your hand out of your face and click Train 1');


  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream
            video.current.addEventListener('loadeddata', resolve)
          },
          error => reject(error)
        )
      } else {
        reject()
      }
    })
  }

  const train = async (label) => {
    for (let i = 0; i < TRAINING_TIMES; i++) {
      console.log(`Progress ${parseInt((i + 1) / TRAINING_TIMES * 100)}%`);

      await sleep(100)
    }
  }

  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  useEffect(() => {
    // init camera
    init()

    // clean up
    return () => {

    }
  }, [])

  return (
    <div className="main">
      <video
        ref={video}
        className='video'
        autoPlay>
      </video>

      <div className='control'>
        <button className='btn' onClick={() => { train(NOT_TOUCH_LABEL) }}>Train 1</button>
        <button className='btn' onClick={() => { train(TOUCH_LABEL) }}>Train 2</button>
        <button className='btn' onClick={() => { }}>Run</button>
      </div>
    </div>
  );
}

export default App;
