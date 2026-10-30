// school.webp uses a custom generated icon based on the user-provided school photo.
// 게임 아이콘 목록. 그림은 Microsoft Fluent Emoji의 3D 스타일(MIT 라이선스)입니다.
// 게임용 작은 그림(src/assets/icons/<id>.webp)은 `npm run icons`로 다시 받아서 만들 수 있습니다.
// 저작권 표시: licenses/fluentui-emoji.txt

export const ICONS = {
  compass: 'Compass/3D/compass_3d.png',
  ghost: 'Ghost/3D/ghost_3d.png',
  school: null, // Custom school icon, generated from the user's Seodaejeon school photo.
  backpack: 'Backpack/3D/backpack_3d.png',
  box: 'Wrapped gift/3D/wrapped_gift_3d.png',
  web: 'Spider web/3D/spider_web_3d.png',
  ice: 'Ice/3D/ice_3d.png',
  speedUp: 'High voltage/3D/high_voltage_3d.png',
  flashlight: 'Flashlight/3D/flashlight_3d.png',
  slowDown: 'Snail/3D/snail_3d.png',
  freeze: 'Snowflake/3D/snowflake_3d.png',
  reverse: 'Face with spiral eyes/3D/face_with_spiral_eyes_3d.png',
  dark: 'New moon/3D/new_moon_3d.png',
  dizzy: 'Dizzy/3D/dizzy_3d.png',
  trophy: 'Trophy/3D/trophy_3d.png',
  sparkles: 'Sparkles/3D/sparkles_3d.png',
  home: 'House with garden/3D/house_with_garden_3d.png',
};

// Local originals take priority when running npm run icons.
export const CUSTOM_ICON_SOURCES = { school: 'ref/generated-originals/seodaejeon-school.png' };
