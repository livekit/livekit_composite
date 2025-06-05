export const sampleData = {
  avatar: "https://i.imgur.com/MK3eW3As.jpg",
  string: "Lorem ipsum dolor sit amet",
  integer: 42,
  float: 114.514,
  bigint: 10086,
  null: null,
  undefined,
  timer: 0,
  nan: NaN,
  url: new URL("https://example.com"),
  date: new Date("Tue Sep 13 2022 14:07:44 GMT-0500 (Central Daylight Time)"),
  array: [19, 100.86, "test", NaN, Infinity],
  nestedArray: [
    [1, 2],
    [3, 4],
  ],
  object: {
    "first-child": true,
    "second-child": false,
    "last-child": null,
  },
  string_number: "1234",
};

export const scrollbarCss = `
[&::-webkit-scrollbar]:w-2
[&::-webkit-scrollbar-track]:rounded-full
[&::-webkit-scrollbar-thumb]:rounded-full
[&::-webkit-scrollbar-thumb]:bg-gray-300
[&::-webkit-scrollbar-thumb]:opacity-50
dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500`;
