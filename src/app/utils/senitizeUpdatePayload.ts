
// export const sanitizeUpdatePayload = (payload: Partial<IPackage>): Partial<IPackage> => {
//   const cleaned: any = {};

//   for (const [key, value] of Object.entries(payload)) {
//     // 1) undefined hole kokhono set korbo na
//     if (value === undefined) continue;

//     // 2) coverImage: sudhu non-empty string holei update
//     if (key === "coverImage") {
//       if (typeof value === "string" && value.trim().length > 0) {
//         cleaned.coverImage = value;
//       }
//       // empty string / space dile ignore
//       continue;
//     }

//     // 3) images: sudhu non-empty array holei update
//     if (key === "images") {
//       if (Array.isArray(value) && value.length > 0) {
//         cleaned.images = value;
//       }
//       // [] hole ignore -> ager images thakbe
//       continue;
//     }

//     // onno shob field normal vabe set hobe
//     cleaned[key] = value;
//   }

//   return cleaned;
// };