import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type MessageRowProps = {
  name: string;
  time: string;
  listingRef: string;
  preview: string;
  unreadCount?: number;
  onPress?: () => void;
};

export function MessageRow({
  name,
  time,
  listingRef,
  preview,
  unreadCount,
  onPress,
}: MessageRowProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.av} />
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.listing} numberOfLines={1}>
          {listingRef}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      {unreadCount != null && unreadCount > 0 && (
        <View style={styles.unread}>
          <Text style={styles.unreadText}>{unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  av: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    borderWidth: 1.5,
    borderColor: colors.mid,
    marginTop: 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  name: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
    flex: 1,
  },
  time: {
    fontSize: 10,
    color: colors.mid,
  },
  listing: {
    fontSize: 10,
    color: colors.dark,
    marginBottom: 2,
  },
  preview: {
    fontSize: 11,
    color: colors.dark,
  },
  unread: {
    backgroundColor: colors.ink,
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    fontSize: 9,
    color: colors.white,
    fontWeight: "700",
  },
});
