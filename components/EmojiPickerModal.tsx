import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

const EMOJI_CATEGORIES = {
  'Activities': ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏎️', '🏍️', '🤹', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'],
  'Food': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '🫖', '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊'],
  'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'],
  'Nature': ['🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🪹', '🪺', '🍄'],
  'Objects': ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '🪧', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'],
  'Home': ['🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️', '🛤️', '🛣️', '🗾', '🎑', '🏞️', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙️', '🌃', '🌌', '🌉', '🌁', '🛏️', '🛋️', '🪑', '🚪', '🪟', '🧺', '🧹', '🧽', '🧼', '🧻', '🧴', '🪠', '🪣'],
  'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧️', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧'],
  'Celebration': ['🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🎄', '🎃', '🎆', '🎇', '🧨', '✨', '🎋', '🎍', '🎎', '🎏', '🎐', '🎑', '🧧', '🎗️', '🎟️', '🎫', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '⚾', '🥎', '🏀', '🏐', '🏈', '🏉', '🎾', '🥏', '🎳', '🏏', '🏑', '🏒', '🥍', '🏓', '🏸', '🥊', '🥋', '🥅', '⛳', '⛸️', '🎣', '🤿', '🎽', '🎿', '🛷', '🥌'],
  'Work': ['💼', '📁', '📂', '🗂️', '📅', '📆', '🗒️', '🗓️', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '🖇️', '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️', '🔒', '🔓', '🔏', '🔐', '🔑', '🗝️', '🔨', '🪛', '🔧', '🔩', '⚙️', '⛏️', '⚒️', '🛠️', '🪚', '🔗', '⛓️', '🧰', '🧲', '🪜'],
};

// Child-specific emojis for avatar selection
const CHILD_EMOJIS = {
  'Children': ['👶', '👧', '👦', '👶🏻', '👧🏻', '👦🏻', '👶🏼', '👧🏼', '👦🏼', '👶🏽', '👧🏽', '👦🏽', '👶🏾', '👧🏾', '👦🏾', '👶🏿', '👧🏿', '👦🏿'],
};

// Adult/Parent-specific emojis for avatar selection
const PARENT_EMOJIS = {
  'Parents': ['👨', '👩', '👨🏻', '👩🏻', '👨🏼', '👩🏼', '👨🏽', '👩🏽', '👨🏾', '👩🏾', '👨🏿', '👩🏿', '🧔', '🧔🏻', '🧔🏼', '🧔🏽', '🧔🏾', '🧔🏿', '👨‍🦰', '👩‍🦰', '👨‍🦱', '👩‍🦱', '👨‍🦳', '👩‍🦳', '👨‍🦲', '👩‍🦲'],
};

// Emoji keyword mapping for search
const EMOJI_KEYWORDS: Record<string, string[]> = {
  '🧹': ['broom', 'sweep', 'clean', 'cleaning'],
  '🧺': ['basket', 'laundry', 'clothes', 'wash'],
  '🍽️': ['dishes', 'plate', 'wash', 'clean', 'kitchen'],
  '🛏️': ['bed', 'make', 'bedroom', 'sleep'],
  '📚': ['books', 'read', 'study', 'homework'],
  '🚿': ['shower', 'bath', 'clean', 'wash'],
  '🛁': ['bath', 'bathtub', 'clean', 'wash'],
  '🧼': ['soap', 'clean', 'wash', 'hygiene'],
  '🪥': ['toothbrush', 'brush', 'teeth', 'dental'],
  '🧽': ['sponge', 'clean', 'wash', 'dishes'],
  '🧻': ['toilet', 'paper', 'bathroom'],
  '🚽': ['toilet', 'bathroom', 'clean'],
  '💪': ['exercise', 'workout', 'strong', 'fitness'],
  '🎮': ['game', 'play', 'video', 'gaming'],
  '🧩': ['puzzle', 'play', 'toy'],
  '🎨': ['art', 'paint', 'craft', 'draw'],
  '✓': ['check', 'done', 'complete', 'finish'],
  '🐶': ['dog', 'pet', 'puppy', 'animal'],
  '🐱': ['cat', 'pet', 'kitten', 'animal'],
  '🌱': ['plant', 'water', 'garden', 'grow'],
  '🗑️': ['trash', 'garbage', 'waste', 'bin'],
  '🧸': ['toy', 'teddy', 'bear', 'play'],
  '👕': ['shirt', 'clothes', 'laundry', 'fold'],
  '🧦': ['socks', 'clothes', 'laundry', 'fold'],
  '👖': ['pants', 'clothes', 'laundry', 'fold'],
  '🪴': ['plant', 'water', 'garden', 'care'],
  '🍎': ['apple', 'fruit', 'eat', 'snack'],
  '🥤': ['drink', 'beverage', 'cup'],
  '🎒': ['backpack', 'school', 'bag', 'pack'],
  '✏️': ['pencil', 'write', 'homework', 'school'],
  '📝': ['write', 'homework', 'note', 'paper'],
  '🏃': ['run', 'exercise', 'jog', 'fitness'],
  '🚴': ['bike', 'bicycle', 'ride', 'cycle'],
  '⚽': ['soccer', 'football', 'ball', 'sport'],
  '🏀': ['basketball', 'ball', 'sport'],
  '🎸': ['guitar', 'music', 'practice', 'instrument'],
  '🎹': ['piano', 'keyboard', 'music', 'practice'],
};

const RECENT_KEY = '@emoji_picker_recent';
const MAX_RECENT = 24;

interface EmojiPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  selectedEmoji?: string;
  childMode?: boolean;
  parentMode?: boolean;
}

export function EmojiPickerModal({
  visible,
  onClose,
  onSelectEmoji,
  selectedEmoji,
  childMode = false,
  parentMode = false,
}: EmojiPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(
    childMode ? ['👶', '👧', '👦'] : parentMode ? ['👨', '👩', '🧔'] : ['🎁', '🏆', '⭐', '🎮']
  );

  const handleSelectEmoji = (emoji: string) => {
    onSelectEmoji(emoji);
    // Update recent emojis
    const updatedRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, MAX_RECENT);
    setRecentEmojis(updatedRecent);
    onClose();
  };

  // Use child, parent, or regular emojis based on mode
  const emojiCategories = childMode ? CHILD_EMOJIS : parentMode ? PARENT_EMOJIS : EMOJI_CATEGORIES;

  const filteredCategories = searchQuery
    ? Object.entries(emojiCategories).reduce((acc, [category, emojis]) => {
        const query = searchQuery.toLowerCase().trim();
        const filtered = emojis.filter((emoji) => {
          // Check if emoji has keywords defined
          const keywords = EMOJI_KEYWORDS[emoji] || [];
          // Search in keywords or in the category name
          return keywords.some(keyword => keyword.includes(query)) || 
                 category.toLowerCase().includes(query);
        });
        if (filtered.length > 0) {
          acc[category] = filtered;
        }
        return acc;
      }, {} as Record<string, string[]>)
    : emojiCategories;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{childMode ? 'Choose Child Avatar' : parentMode ? 'Choose Your Avatar' : 'Choose Emoji'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {!childMode && !parentMode && (
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search emojis..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {recentEmojis.length > 0 && (
              <View style={styles.categoryContainer}>
                <Text style={styles.categoryTitle}>Recent</Text>
                <View style={styles.emojiGrid}>
                  {recentEmojis.map((emoji, index) => (
                    <TouchableOpacity
                      key={`recent-${index}`}
                      onPress={() => handleSelectEmoji(emoji)}
                      style={[
                        styles.emojiButton,
                        selectedEmoji === emoji && styles.emojiButtonSelected,
                      ]}
                    >
                      <Text style={styles.emoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {Object.entries(filteredCategories).map(([category, emojis]) => (
              <View key={category} style={styles.categoryContainer}>
                <Text style={styles.categoryTitle}>{category}</Text>
                <View style={styles.emojiGrid}>
                  {emojis.map((emoji, index) => (
                    <TouchableOpacity
                      key={`${category}-${index}`}
                      onPress={() => handleSelectEmoji(emoji)}
                      style={[
                        styles.emojiButton,
                        selectedEmoji === emoji && styles.emojiButtonSelected,
                      ]}
                    >
                      <Text style={styles.emoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: '600',
    lineHeight: 20,
    marginTop: -2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  scrollView: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiButtonSelected: {
    backgroundColor: '#FFF4E6',
    borderColor: '#FF6B6B',
  },
  emoji: {
    fontSize: 28,
  },
});
