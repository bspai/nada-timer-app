import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import Svg, { Circle } from 'react-native-svg';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';

type SoundAttribution = {
  title: string;
  author: string;
  url?: string;
  authorUrl?: string;
  license?: string;
  licenseUrl?: string;
};

type SoundOption = {
  id: string;
  name: string;
  description: string;
  durationLabel: string;
  accentColor: string;
  backgroundGradient: [string, string];
  source: number | { uri: string };
  attribution?: SoundAttribution;
};

const TIMER_MIN = 1;
const TIMER_MAX = 60;
const TIMER_STEP = 1;
const RING_SIZE = Dimensions.get('window').width * 0.65;
const STROKE_WIDTH = 16;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SOUND_LIBRARY: SoundOption[] = [
  {
    id: 'naad-wave',
    name: 'Naad Wave',
    description: 'Temple drones with soft harmonics',
    durationLabel: '45 min · Deep Calm',
    accentColor: '#6ba7a0',
    backgroundGradient: ['#f3f8f6', '#e7f0ed'],
    source: require('../assets/naad-wave.mp3'),
    attribution: {
      title: '30 minute relaxation music mix #3.wav',
      author: 'ZHRØ',
      url: 'https://freesound.org/people/ZHR%C3%98/sounds/697611/',
      authorUrl: 'https://freesound.org/people/ZHR%C3%98/',
      license: 'Attribution 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
  },
  {
    id: 'forest-hum',
    name: 'Forest Hum',
    description: 'Mist, distant birds, warm pads',
    durationLabel: '30 min · Woodland Air',
    accentColor: '#7f8d5c',
    backgroundGradient: ['#f4f7f0', '#e6ecda'],
    source: {
      uri: 'https://cdn.pixabay.com/download/audio/2022/02/24/audio_1b816f1bb3.mp3?filename=forest-lullaby-ambient-9956.mp3',
    },
  },
  {
    id: 'lunar-tide',
    name: 'Lunar Tide',
    description: 'Slow synth swells & tides',
    durationLabel: '35 min · Moonlit Flow',
    accentColor: '#7c84b3',
    backgroundGradient: ['#f1f3fb', '#e1e5f6'],
    source: {
      uri: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_d5e6c08c78.mp3?filename=meditation-ambient-112191.mp3',
    },
  },
];

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export default function TimerScreen() {
  const router = useRouter();
  const [presetMinutes, setPresetMinutes] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(presetMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSound, setSelectedSound] = useState<SoundOption>(SOUND_LIBRARY[0]);
  const [visibleSoundIndex, setVisibleSoundIndex] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const previewSoundRef = useRef<Audio.Sound | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPreview = async () => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    if (previewSoundRef.current) {
      try {
        await previewSoundRef.current.stopAsync();
      } catch {
        /* ignore */
      }
      await previewSoundRef.current.unloadAsync();
      previewSoundRef.current = null;
    }
  };

  const playPreview = async (soundOption: SoundOption) => {
    await stopPreview();
    try {
      const { sound } = await Audio.Sound.createAsync(soundOption.source, {
        isLooping: false,
        shouldPlay: true,
        volume: 0.6,
      });
      previewSoundRef.current = sound;
      previewTimeoutRef.current = setTimeout(async () => {
        if (previewSoundRef.current) {
          try {
            await previewSoundRef.current.stopAsync();
          } catch {
            /* ignore */
          }
          await previewSoundRef.current.unloadAsync();
          previewSoundRef.current = null;
        }
        previewTimeoutRef.current = null;
      }, 2000);
    } catch (error) {
      console.warn('Preview playback error', error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadSound = async () => {
      try {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }
        const { sound } = await Audio.Sound.createAsync(selectedSound.source, {
          isLooping: true,
          volume: 0.45,
          shouldPlay: false,
        });
        if (cancelled) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
      } catch (error) {
        console.warn('Sound load error', error);
      }
    };
    loadSound();

    return () => {
      cancelled = true;
    };
  }, [selectedSound]);

  useEffect(() => {
    if (isRunning) {
      return;
    }
    setSecondsLeft(presetMinutes * 60);
  }, [presetMinutes, isRunning]);

  useEffect(() => {
    const sound = soundRef.current;
    if (!sound) return;

    const togglePlayback = async () => {
      try {
        if (isRunning) {
          await sound.setPositionAsync(0);
          await sound.playAsync();
        } else {
          await sound.stopAsync();
        }
      } catch (error) {
        console.warn('Sound playback error', error);
      }
    };

    togglePlayback();
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) return;

    const startTime = Date.now();
    const initialSeconds = secondsLeft;

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const nextSeconds = Math.max(0, initialSeconds - elapsedSeconds);
      setSecondsLeft((prev) => (prev !== nextSeconds ? nextSeconds : prev));

      if (nextSeconds <= 0) {
        setIsRunning(false);
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
      soundRef.current = null;
      stopPreview();
    };
  }, []);

  const handleSoundSelect = async (soundOption: SoundOption) => {
    setSelectedSound(soundOption);
    const newIndex = SOUND_LIBRARY.findIndex((entry) => entry.id === soundOption.id);
    if (newIndex !== -1) {
      setVisibleSoundIndex(newIndex);
    }
    await playPreview(soundOption);
  };

  const handleMoveSound = (direction: 'prev' | 'next') => {
    setVisibleSoundIndex((prev) => {
      const length = SOUND_LIBRARY.length;
      const offset = direction === 'prev' ? -1 : 1;
      const nextIndex = (prev + offset + length) % length;
      const nextSound = SOUND_LIBRARY[nextIndex];
      setSelectedSound(nextSound);
      return nextIndex;
    });
  };

  const handleStartPause = () => {
    stopPreview();
    if (secondsLeft === 0) {
      setSecondsLeft(presetMinutes * 60);
    }
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    stopPreview();
    setIsRunning(false);
    setSecondsLeft(presetMinutes * 60);
  };

  const totalSeconds = presetMinutes * 60;
  const progress = totalSeconds === 0 ? 0 : 1 - secondsLeft / totalSeconds;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <LinearGradient colors={['#fefbf4', '#eaf2ef', '#dbe4ea']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.overline}>Mindful focus</Text>
          <Text style={styles.heading}>Nada Timer</Text>
          <Text style={styles.description}>
            Let the timer keep gentle track of the moment, with soothing music in the background.
          </Text>

          <View style={styles.timerCard}>
            <View style={styles.ringWrapper}>
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  stroke="#c0d6d3"
                  strokeDasharray="8,12"
                  strokeWidth={4}
                  fill="none"
                />
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  stroke="#6ba7a0"
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${CIRCUMFERENCE}, ${CIRCUMFERENCE}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  fill="none"
                  rotation="-90"
                  origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                />
              </Svg>
              <View style={styles.timerTextWrapper}>
                <Text style={styles.timerValue}>{formatTime(secondsLeft)}</Text>
                <Text style={styles.timerLabel}>remaining</Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <Pressable style={styles.primaryButton} onPress={handleStartPause}>
                <Text style={styles.primaryButtonText}>
                  {isRunning ? 'Pause' : secondsLeft === 0 ? 'Restart' : 'Start'}
                </Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleReset}>
                <Text style={styles.secondaryButtonText}>Reset</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.controlsCard}>
            <Text style={styles.sliderLabel}>Session length (minutes)</Text>
            <Slider
              minimumValue={TIMER_MIN}
              maximumValue={TIMER_MAX}
              step={TIMER_STEP}
              value={presetMinutes}
              disabled={isRunning}
              onValueChange={(value) => {
                const minutes = Math.round(value);
                setPresetMinutes(minutes);
                if (!isRunning) {
                  setSecondsLeft(minutes * 60);
                }
              }}
              minimumTrackTintColor="#6ba7a0"
              maximumTrackTintColor="#d4c7b6"
              thumbTintColor="#4c7c7a"
            />
            <Text style={styles.sliderValue}>{presetMinutes} minutes</Text>
          </View>

          <View style={styles.soundCard}>
            <Text style={styles.soundLabel}>Background sound</Text>
            <View style={styles.soundCarousel}>
              <Pressable
                accessibilityLabel="Previous sound"
                onPress={() => handleMoveSound('prev')}
                style={styles.carouselButton}
              >
                <Text style={styles.carouselButtonText}>‹</Text>
              </Pressable>
              <View style={styles.soundCardWrapper}>
                {SOUND_LIBRARY.map((sound, index) => {
                  if (index !== visibleSoundIndex) return null;
                  const isSelected = sound.id === selectedSound.id;
                  return (
                    <LinearGradient
                      key={sound.id}
                      colors={sound.backgroundGradient}
                      style={[
                        styles.soundCardInner,
                        isSelected && { borderColor: sound.accentColor },
                      ]}
                    >
                      <Pressable
                        onPress={() => handleSoundSelect(sound)}
                        style={styles.soundPressable}
                      >
                        <View style={styles.soundTitleRow}>
                          <Text style={styles.soundName}>{sound.name}</Text>
                          {isSelected && (
                            <Text style={[styles.selectedBadge, { color: sound.accentColor }]}>
                              Selected
                            </Text>
                          )}
                        </View>
                        <Text style={styles.soundDescription}>{sound.description}</Text>
                        <Text style={styles.soundDuration}>{sound.durationLabel}</Text>
                        <Text style={styles.soundHint}>Tap to preview (2s)</Text>
                      </Pressable>
                    </LinearGradient>
                  );
                })}
              </View>
              <Pressable
                accessibilityLabel="Next sound"
                onPress={() => handleMoveSound('next')}
                style={styles.carouselButton}
              >
                <Text style={styles.carouselButtonText}>›</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.attributionCard}>
            <Text style={styles.attributionLabel}>Sound attribution</Text>
            {selectedSound.attribution ? (
              <Text style={styles.attributionText}>
                {selectedSound.attribution.title} by {selectedSound.attribution.author}
                {selectedSound.attribution.license ? ` • ${selectedSound.attribution.license}` : ''}
              </Text>
            ) : (
              <Text style={styles.attributionText}>Royalty-free ambience courtesy of Pixabay.</Text>
            )}
          </View>

          <Pressable onPress={() => router.replace('/')} style={styles.backLink}>
            <Text style={styles.backLinkText}>Back to login</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: 24,
    gap: 24,
    alignItems: 'center',
  },
  overline: {
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: '#7b8f94',
    fontSize: 12,
  },
  heading: {
    fontSize: 38,
    fontWeight: '600',
    color: '#1d3557',
  },
  description: {
    textAlign: 'center',
    color: '#5f6f73',
    maxWidth: 420,
    fontSize: 15,
  },
  timerCard: {
    width: '100%',
    borderRadius: 32,
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#e9e0d0',
    shadowColor: '#193447',
    shadowOffset: { width: 0, height: 45 },
    shadowOpacity: 0.3,
    shadowRadius: 60,
    elevation: 16,
    alignItems: 'center',
    gap: 24,
  },
  ringWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerTextWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  timerValue: {
    fontSize: 56,
    fontWeight: '600',
    color: '#1d3557',
  },
  timerLabel: {
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: '#93a8a4',
    fontSize: 12,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#4c7c7a',
    borderRadius: 999,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d4c7b6',
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    color: '#6f5f4c',
    fontWeight: '600',
    fontSize: 16,
  },
  controlsCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: '#e5ddd1',
    shadowColor: '#648089',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 6,
    gap: 12,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6f5f4c',
  },
  sliderValue: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '500',
    color: '#4d6166',
  },
  attributionCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5ddd1',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  attributionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 4,
    fontSize: 11,
    color: '#a6b1b2',
    marginBottom: 6,
  },
  attributionText: {
    color: '#4d6166',
    fontSize: 14,
  },
  backLink: {
    paddingVertical: 12,
  },
  backLinkText: {
    color: '#4c7c7a',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  soundCard: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: '#e5ddd1',
    gap: 16,
  },
  soundLabel: {
    textTransform: 'uppercase',
    letterSpacing: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#6f5f4c',
  },
  soundCarousel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  carouselButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#d4c7b6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  carouselButtonText: {
    fontSize: 22,
    color: '#6f5f4c',
    fontWeight: '600',
  },
  soundCardWrapper: {
    flex: 1,
  },
  soundCardInner: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  soundPressable: {
    gap: 8,
  },
  soundTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  soundName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1d3557',
    letterSpacing: 1,
  },
  selectedBadge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  soundDescription: {
    fontSize: 16,
    color: '#1d3557',
    fontWeight: '500',
  },
  soundDuration: {
    fontSize: 13,
    color: '#6b7a80',
  },
  soundHint: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#a3b0b4',
  },
});
