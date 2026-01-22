import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import Svg, { Circle } from 'react-native-svg';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getTemplates, saveTemplate, deleteTemplate, Template } from '../utils/storage';
import { SafeAreaView } from 'react-native-safe-area-context';

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
const TEMPLATE_CARD_WIDTH = 220;
const TEMPLATE_CARD_SPACING = 16;

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
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const previewSoundRef = useRef<Audio.Sound | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(0);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const templatesScrollRef = useRef<ScrollView | null>(null);

  const orderedTemplates = useMemo(() => templates.slice().reverse(), [templates]);
  const cardStride = TEMPLATE_CARD_WIDTH + TEMPLATE_CARD_SPACING;
  console.log("Selected sound",selectedSound)
  const scrollToTemplate = (index: number, animated = true) => {
    if (!templatesScrollRef.current) return;
    templatesScrollRef.current.scrollTo({
      x: index * cardStride,
      animated,
    });
  };

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

  useEffect(() => {
    let mounted = true;
    const loadTemplates = async () => {
      try {
        const stored = await getTemplates();
        if (mounted) {
          setTemplates(stored);
        }
      } catch (error) {
        console.warn('Template load error', error);
      } finally {
        if (mounted) {
          setLoadingTemplates(false);
        }
      }
    };
    loadTemplates();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (orderedTemplates.length === 0) {
      setActiveTemplateIndex(0);
      return;
    }
    setActiveTemplateIndex((prev) => {
      const safeIndex = Math.min(prev, orderedTemplates.length - 1);
      setTimeout(() => scrollToTemplate(safeIndex, false), 0);
      return safeIndex;
    });
  }, [orderedTemplates.length]);

  const openSoundPicker = () => setShowSoundPicker(true);
  const closeSoundPicker = () => setShowSoundPicker(false);

  const handleSoundPreview = async (soundOption: SoundOption) => {
    await playPreview(soundOption);
  };

  const handleSelectSoundFromPicker = async (soundOption: SoundOption) => {
    setSelectedSound(soundOption);
    closeSoundPicker();
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

  const applyTemplateValues = (template: Template) => {
    stopPreview();
    setIsRunning(false);
    setPresetMinutes(template.minutes);
    setSecondsLeft(template.minutes * 60);
    const soundMatch = SOUND_LIBRARY.find((entry) => entry.id === template.soundId);
    if (soundMatch) {
      setSelectedSound(soundMatch);
      const nextIndex = SOUND_LIBRARY.findIndex((entry) => entry.id === soundMatch.id);
    } else {
      Alert.alert('Sound unavailable', 'The saved sound is no longer in the library.');
    }
  };

  const applyTemplateAtIndex = (
    index: number,
    options: { scroll?: boolean; apply?: boolean } = {},
  ) => {
    const template = orderedTemplates[index];
    if (!template) return;
    const shouldScroll = options.scroll ?? true;
    const shouldApply = options.apply ?? true;
    if (shouldScroll) {
      scrollToTemplate(index);
    }
    setActiveTemplateIndex(index);
    if (shouldApply) {
      applyTemplateValues(template);
    }
  };

  const handleTemplateArrow = (direction: 'prev' | 'next') => {
    if (orderedTemplates.length === 0) return;
    const offset = direction === 'prev' ? -1 : 1;
    const nextIndex = Math.min(
      Math.max(activeTemplateIndex + offset, 0),
      orderedTemplates.length - 1,
    );
    if (nextIndex === activeTemplateIndex) return;
    applyTemplateAtIndex(nextIndex);
  };

  const handleTemplatesMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / cardStride);
    if (index >= 0 && index < orderedTemplates.length && index !== activeTemplateIndex) {
      applyTemplateAtIndex(index, { scroll: false });
    }
  };

  const resetTemplateForm = () => {
    setTemplateName('');
    setTemplateError('');
    setEditingTemplate(null);
  };

  const handleOpenSaveModal = () => {
    if (isRunning) {
      Alert.alert('Pause timer', 'Please pause the timer before saving a preset.');
      return;
    }
    resetTemplateForm();
    setShowSaveModal(true);
  };

  const handleOpenEditModal = (template: Template) => {
    if (isRunning) {
      Alert.alert('Pause timer', 'Please pause the timer before editing a preset.');
      return;
    }
    setEditingTemplate(template);
    setTemplateName(template.name || template.label);
    setTemplateError('');
    setShowSaveModal(true);
  };

  const handleCloseSaveModal = () => {
    setShowSaveModal(false);
    resetTemplateForm();
  };

  const handleTemplateNameChange = (value: string) => {
    if (templateError) {
      setTemplateError('');
    }
    setTemplateName(value);
  };

  const handleConfirmSaveTemplate = async () => {
    const trimmedName = templateName.trim();
    if (!trimmedName) {
      setTemplateError('Give this ritual a name.');
      return;
    }
    
    try {
      setSavingTemplate(true);
      const updated = await saveTemplate(
        presetMinutes,
        selectedSound.id,
        trimmedName,
        editingTemplate?.id
      );
      setTemplates(updated);
      setShowSaveModal(false);
      resetTemplateForm();
      const action = editingTemplate ? 'updated' : 'saved';
      Alert.alert('Preset ' + action, 'Find it in your Saved rituals carousel.');
    } catch (error) {
      Alert.alert('Save failed', 'Could not store this preset. Please try again.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    Alert.alert(
      'Delete ritual',
      `Are you sure you want to delete "${template.name || template.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await deleteTemplate(template.id);
              setTemplates(updated);
              // Adjust active index if needed
              if (activeTemplateIndex >= orderedTemplates.length - 1) {
                setActiveTemplateIndex(Math.max(0, orderedTemplates.length - 2));
              }
            } catch (error) {
              Alert.alert('Delete failed', 'Could not delete this preset. Please try again.');
            }
          },
        },
      ]
    );
  };

  const describeTemplate = (template: Template) => {
    const soundName = SOUND_LIBRARY.find((entry) => entry.id === template.soundId)?.name;
    return soundName ? `${soundName} • ${template.minutes} min` : `${template.minutes} min`;
  };

  const totalSeconds = presetMinutes * 60;
  const progress = totalSeconds === 0 ? 0 : 1 - secondsLeft / totalSeconds;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <LinearGradient colors={['#fefbf4', '#f1ede1']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <Pressable
            style={styles.hamburgerButton}
            accessibilityLabel="Open menu"
            onPress={() => setIsSidebarOpen(true)}
          >
            <MaterialIcons name="menu" size={28} color="#1d3557" />
          </Pressable>
          <Text style={styles.headerTitle}>Nada Timer</Text>
        </View>
        <Modal
          visible={showSoundPicker}
          animationType="slide"
          transparent
          onRequestClose={closeSoundPicker}
        >
          <View style={styles.soundPickerOverlay}>
            <Pressable style={styles.soundPickerBackdrop} onPress={closeSoundPicker} />
            <View style={styles.soundPickerCard}>
              <View style={styles.soundPickerHeader}>
                <Text style={styles.soundPickerTitle}>Choose a background sound</Text>
                <Pressable style={styles.soundPickerClose} onPress={closeSoundPicker}>
                  <MaterialIcons name="close" size={22} color="#4c7c7a" />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.soundPickerList}>
                {SOUND_LIBRARY.map((sound) => {
                  const isSelected = sound.id === selectedSound.id;
                  return (
                    <Pressable
                      key={sound.id}
                      style={[styles.soundPickerRow, isSelected && styles.soundPickerRowActive]}
                      onPress={() => handleSelectSoundFromPicker(sound)}
                    >
                      <View>
                        <Text style={styles.soundPickerText}>{sound.name}</Text>
                        <Text style={styles.soundPickerDescription}>{sound.description}</Text>
                      </View>
                      <View style={styles.soundPickerActions}>
                        <Pressable
                          style={styles.soundPickerPreviewButton}
                          onPress={() => handleSoundPreview(sound)}
                        >
                          <MaterialIcons name="play-arrow" size={18} color="#4c7c7a" />
                        </Pressable>
                        {isSelected && (
                          <MaterialIcons name="check-circle" size={22} color="#4c7c7a" />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.timerCard}>
            <Text style={styles.subtitle}>Mindful focus companion</Text>
            <Text style={styles.description}>
              Let the timer keep gentle track of the moment, with soothing music in the background.
            </Text>
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
            <View style={styles.soundCardHeader}>
              <Text style={styles.soundLabel}>Background sound</Text>
              <Pressable style={styles.soundSearch} onPress={openSoundPicker}>
                <MaterialIcons name="search" size={20} color="#1d3557" />
              </Pressable>
            </View>
            <View style={styles.soundCarousel}>
              <View style={styles.soundCardWrapper}>
                {(() => {
                  const  sound  = selectedSound;
                  return (
                    <LinearGradient
                      key={sound.id}
                      colors={sound.backgroundGradient}
                      style={[
                        styles.soundCardInner,
                        { borderColor: sound.accentColor },
                      ]}
                    >
                        <View style={styles.soundTitleRow}>
                          <Text style={styles.soundName}>{sound.name}</Text>
                        </View>
                        <Text style={styles.soundDescription}>{sound.description}</Text>
                        <Text style={styles.soundDuration}>{sound.durationLabel}</Text>
                        <Text style={styles.soundHint}>Tap to preview (2s)</Text>
                    </LinearGradient>
                  );
                })()}
              </View>
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

                    <View style={styles.templatesSection}>
            <View style={styles.templatesHeader}>
              <Text style={styles.templatesLabel}>Saved rituals</Text>
              <Pressable
                style={[
                  styles.saveTemplateButton,
                  (savingTemplate || isRunning) && styles.saveTemplateButtonDisabled,
                ]}
                onPress={handleOpenSaveModal}
                disabled={savingTemplate || isRunning}
              >
                <Text style={styles.saveTemplateButtonText}>
                  {savingTemplate ? 'Saving…' : 'Save preset'}
                </Text>
              </Pressable>
            </View>
            {loadingTemplates ? (
              <Text style={styles.templatesPlaceholder}>Loading your presets…</Text>
            ) : orderedTemplates.length === 0 ? (
              <View style={styles.templatesEmpty}>
                <Text style={styles.templatesEmptyTitle}>No rituals saved yet</Text>
                <Text style={styles.templatesEmptySubtitle}>
                  Tap “Save preset” to store this session length and sound mix.
                </Text>
              </View>
            ) : (
              <View style={styles.templatesCarouselRow}>
                <TouchableOpacity
                  style={[
                    styles.templatesArrowButton,
                    activeTemplateIndex === 0 && styles.templatesArrowDisabled,
                  ]}
                  onPress={() => handleTemplateArrow('prev')}
                  disabled={activeTemplateIndex === 0}
                >
                  <MaterialIcons
                    name="chevron-left"
                    size={28}
                    color={activeTemplateIndex === 0 ? '#c3c3c3' : '#4c7c7a'}
                  />
                </TouchableOpacity>
                <ScrollView
                  ref={templatesScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={cardStride}
                  decelerationRate="fast"
                  disableIntervalMomentum
                  contentContainerStyle={styles.templatesCarouselContent}
                  onMomentumScrollEnd={handleTemplatesMomentumEnd}
                >
                  {orderedTemplates.map((template, index) => (
                    <TouchableOpacity
                      key={template.id}
                      style={[
                        styles.templateCard,
                        index === activeTemplateIndex && styles.templateCardActive,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => applyTemplateAtIndex(index)}
                    >
                      <View style={styles.templateCardHeader}>
                        <Text style={styles.templateName}>{template.name}</Text>
                        <View style={styles.templateActions}>
                          <TouchableOpacity
                            style={styles.templateEditButton}
                            onPress={() => handleOpenEditModal(template)}
                          >
                            <MaterialIcons name="edit" size={16} color="#4c7c7a" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.templateDeleteButton}
                            onPress={() => handleDeleteTemplate(template)}
                          >
                            <MaterialIcons name="delete" size={16} color="#d66a6a" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.templateMeta}>{describeTemplate(template)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={[
                    styles.templatesArrowButton,
                    activeTemplateIndex === orderedTemplates.length - 1 &&
                      styles.templatesArrowDisabled,
                  ]}
                  onPress={() => handleTemplateArrow('next')}
                  disabled={activeTemplateIndex === orderedTemplates.length - 1}
                >
                  <MaterialIcons
                    name="chevron-right"
                    size={28}
                    color={
                      activeTemplateIndex === orderedTemplates.length - 1 ? '#c3c3c3' : '#4c7c7a'
                    }
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Pressable onPress={() => router.replace('/')} style={styles.backLink}>
            <Text style={styles.backLinkText}>Back to login</Text>
          </Pressable>
        </ScrollView>
        {isSidebarOpen && (
          <View style={styles.sidebarOverlay} pointerEvents="box-none">
            <Pressable style={styles.overlayBackdrop} onPress={() => setIsSidebarOpen(false)} />
            <View style={styles.sidebar}>
              <Text style={styles.sidebarTitle}>Menu</Text>
              <Pressable
                style={styles.sidebarItem}
                onPress={() => {
                  setIsSidebarOpen(false);
                  router.push('/settings');
                }}
              >
                <View style={styles.sidebarIconWrap}>
                  <MaterialIcons name="settings" size={20} color="#4c7c7a" />
                </View>
                <Text style={styles.sidebarLabel}>Settings</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>

      <Modal
        visible={showSaveModal}
        animationType="fade"
        transparent
        onRequestClose={handleCloseSaveModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingTemplate ? 'Edit ritual' : 'Name this ritual'}
            </Text>
            <Text style={styles.modalDescription}>
              Save the current session length and background sound for quick reuse later.
            </Text>
            <TextInput
              style={[styles.modalInput, templateError && styles.modalInputError]}
              placeholder="Ex: Sunrise calm"
              placeholderTextColor="#a7a0a0"
              value={templateName}
              onChangeText={handleTemplateNameChange}
              autoFocus
              editable={!savingTemplate}
              returnKeyType="done"
              onSubmitEditing={handleConfirmSaveTemplate}
            />
            {!!templateError && <Text style={styles.modalError}>{templateError}</Text>}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondary} onPress={handleCloseSaveModal} disabled={savingTemplate}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalPrimary,
                  (savingTemplate || !templateName.trim()) && styles.modalPrimaryDisabled,
                ]}
                onPress={handleConfirmSaveTemplate}
                disabled={savingTemplate || !templateName.trim()}
              >
                <Text style={styles.modalPrimaryText}>
                  {savingTemplate ? 'Saving…' : (editingTemplate ? 'Update ritual' : 'Save ritual')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  headerBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderBottomWidth: 1,
    borderBottomColor: '#ece4db',
  },
  hamburgerButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: '#1d3557',
  },
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
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e9e0d0',
    shadowColor: '#193447',
    shadowOffset: { width: 0, height: 35 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 10,
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1d3557',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#7b8f94',
  },
  sidebarOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 12,
    flexDirection: 'row',
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sidebar: {
    width: 220,
    height: '100%',
    backgroundColor: '#fff',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  sidebarTitle: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#6f6f6f',
    marginBottom: 12,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    marginBottom: 6,
  },
  sidebarIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(76,124,122,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sidebarLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f3f3c',
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
  templatesSection: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: '#e5ddd1',
    gap: 16,
  },
  templatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  templatesLabel: {
    textTransform: 'uppercase',
    letterSpacing: 3,
    fontSize: 12,
    fontWeight: '600',
    color: '#6f5f4c',
  },
  saveTemplateButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#4c7c7a',
  },
  saveTemplateButtonDisabled: {
    opacity: 0.4,
  },
  saveTemplateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  templatesPlaceholder: {
    fontSize: 14,
    color: '#7b8f94',
    lineHeight: 20,
  },
  templatesEmpty: {
    alignItems: 'center',
    gap: 6,
  },
  templatesEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d3557',
  },
  templatesEmptySubtitle: {
    fontSize: 13,
    color: '#5f6f73',
    textAlign: 'center',
  },
  templatesCarouselRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  templatesArrowButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#d4c7b6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  templatesArrowDisabled: {
    opacity: 0.4,
  },
  templatesCarouselContent: {
    paddingHorizontal: 4,
  },
  templateCard: {
    width: TEMPLATE_CARD_WIDTH,
    marginHorizontal: TEMPLATE_CARD_SPACING / 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e7dcca',
    padding: 10,
    backgroundColor: '#fff',
  },
  templateCardActive: {
    borderColor: '#4c7c7a',
    backgroundColor: '#f0f7f6',
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d3557',
    marginBottom: 6,
  },
  templateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  templateEditButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f0f7f6',
  },
  templateDeleteButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#fef2f2',
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5ddd1',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  templateLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1d3557',
  },
  templateMeta: {
    fontSize: 13,
    color: '#5f6f73',
  },
  templateApply: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4c7c7a',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  soundPickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    justifyContent: 'flex-end',
  },
  soundPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  soundPickerCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  soundPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  soundPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1d3557',
  },
  soundPickerClose: {
    padding: 4,
  },
  soundPickerList: {
    paddingBottom: 40,
    gap: 12,
  },
  soundPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5ddd1',
  },
  soundPickerRowActive: {
    borderColor: '#4c7c7a',
    backgroundColor: '#f0f7f6',
  },
  soundPickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d3557',
  },
  soundPickerDescription: {
    fontSize: 13,
    color: '#5f6f73',
  },
  soundPickerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  soundPickerPreviewButton: {
    padding: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d4c7b6',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    backgroundColor: '#fff',
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1d3557',
  },
  modalDescription: {
    fontSize: 14,
    color: '#5f6f73',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e1d8c9',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#2f2f2f',
    backgroundColor: '#f8f4ed',
  },
  modalInputError: {
    borderColor: '#d66a6a',
  },
  modalError: {
    color: '#c25a5a',
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d4c7b6',
  },
  modalSecondaryText: {
    color: '#5f6f73',
    fontWeight: '600',
  },
  modalPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: '#4c7c7a',
  },
  modalPrimaryDisabled: {
    opacity: 0.5,
  },
  modalPrimaryText: {
    color: '#fff',
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
  soundCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  soundSearch: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(76,124,122,0.08)',
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
    gap: 8,
  },
  soundName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1d3557',
    letterSpacing: 0.3,
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
