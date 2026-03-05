import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type ListingCarouselProps = {
  imageCount?: number;
  activeIndex?: number;
};

export function ListingCarousel({
  imageCount = 3,
  activeIndex = 0,
}: ListingCarouselProps) {
  return (
    <>
      <View style={styles.carousel}>
        <Text style={styles.placeholder}>
          [ Image Carousel — swipe for more ]
        </Text>
      </View>
      <View style={styles.dots}>
        {Array.from({ length: imageCount }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotOn]}
          />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  carousel: {
    width: "100%",
    height: 200,
    backgroundColor: colors.bg,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: colors.mid,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    fontSize: 10,
    color: colors.mid,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.mid,
  },
  dotOn: {
    backgroundColor: colors.ink,
  },
});
