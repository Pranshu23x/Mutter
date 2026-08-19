import { Image } from "react-native";

export default function BrandMark({ style }) {
  return (
    <Image
      source={require("../assets/mutter-branding.png")}
      resizeMode="contain"
      style={[defaultStyles.brandMark, style]}
    />
  );
}

const defaultStyles = {
  brandMark: {
    width: 128,
    height: 30,
  },
};
