import React, { type CSSProperties, type ReactNode } from "react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  interpolate,
  registerRoot,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { loadFont as loadBengali } from "@remotion/google-fonts/NotoSansBengali";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerif";

/* ────────────────────────────────────────────────────────────
   1. কনফিগ, ফন্ট ও রং
   ──────────────────────────────────────────────────────────── */

const FPS = 30;
const DURATION_SEC = 109; // শেষ সাবটাইটেল ১:৪৭.৮৮ + একটু বাড়তি সময়

const bengali = loadBengali("normal", {
  weights: ["400", "700"],
  subsets: ["bengali", "latin"],
});
const serif = loadSerif("normal", {
  weights: ["400", "700"],
  subsets: ["latin", "greek"],
});

const UI = `${bengali.fontFamily}, ${serif.fontFamily}, sans-serif`;
const MATH = `${serif.fontFamily}, ${bengali.fontFamily}, sans-serif`;

const C = {
  L: "#ff6b6b", // লম্ব
  B: "#4dabf7", // ভূমি
  H: "#ffd43b", // অতিভুজ
  T: "#69db7c", // θ
  text: "#f1f3f5",
  dim: "#ced4da",
};

const ROW = 72; // সমীকরণের ফন্ট সাইজ
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/* ────────────────────────────────────────────────────────────
   2. সাবটাইটেল (SRT সরাসরি ফাইলের ভেতরেই)
   ──────────────────────────────────────────────────────────── */

const SRT = `1
00:00:00,100 --> 00:00:06,800
তুমি কি কখনো ভেবেছো sine square theta plus
cos square theta সবসময় একের সমান হয়

2
00:00:06,800 --> 00:00:07,020
কেন?

3
00:00:07,780 --> 00:00:14,760
দেখতে সূত্রটা কঠিন মনে হলেও এর পেছনের
logic টা কিন্তু খুবই সহজ। চলো বুঝে নিই

4
00:00:14,760 --> 00:00:21,500
মাত্র দুই মিনিটে। প্রথমে একটি সমকোণী
ত্রিভুজ কল্পনা করো। এর একটি কোণ theta

5
00:00:22,120 --> 00:00:26,360
আর তিনটি বাহু হলো লম্ব, ভূমি এবং অতিভুজ।

6
00:00:27,080 --> 00:00:33,940
আমরা জানি sine theta সমান লম্ব ভাগ অতিভুজ
আর cos theta সমান ভূমি ভাগ

7
00:00:33,940 --> 00:00:40,840
অতিভুজ। এবার এই দুইটি রাশির বর্গ করি।
তাহলে sine square theta হবে

8
00:00:40,840 --> 00:00:47,780
লম্বের বর্গ ভাগ অতিভরাজের বর্গ আর cos
square theta হবে ভূমির বর্গ ভাগ

9
00:00:47,780 --> 00:00:48,740
অতিভরাজের বর্গ।

10
00:00:49,380 --> 00:00:55,820
এখন দুটো যোগ করি। পাই লম্বের বর্গ যোগ
ভূমির বর্গ ভাগ অতিভরাজের

11
00:00:55,820 --> 00:01:02,820
বর্গ। কিন্তু এখানেই আছে আসল রহস্য।
পিথাগোরাসের উপপাদ্য অনুযায়ী একটি সমকোণী

12
00:01:02,820 --> 00:01:09,620
ত্রিভুজে লম্বের বর্গ যোগ ভূমির বর্গ সমান
অতিভরাজের বর্গ। তাই লবের

13
00:01:09,620 --> 00:01:16,580
জায়গায় আমরা অতিভরাজের বর্গ বসাতে পারি।
এখন দেখো অতিভরাজের বর্গ ভাগ অতিভরাজের

14
00:01:16,580 --> 00:01:16,920
বর্গ।

15
00:01:17,640 --> 00:01:24,440
যে কোন শূন্য নয় এমন সংখ্যাকে সেই সংখ্যা
দিয়ে ভাগ করলে উত্তর হয় এক। ব্যাস

16
00:01:24,440 --> 00:01:31,000
প্রমাণ হয়ে গেল sine square theta plus
cos square theta সমান এক। মনে রেখো

17
00:01:31,000 --> 00:01:37,860
এই সূত্রটি শুধু মুখস্থ করার জন্য নয়। এটি
এসেছে পিথাগোরাসের উপপাদ্য থেকে।

18
00:01:37,880 --> 00:01:43,940
অর্থাৎ ত্রিকোণমিতির এই গুরুত্বপূর্ণ
সূত্রের পেছনে রয়েছে জ্যামিতির একটি সহজ

19
00:01:43,940 --> 00:01:47,880
যুক্তি। গণিতকে মুখস্থ নয় বুঝে শেখো।
`;

type Cue = { start: number; end: number; text: string };

const parseCues = (raw: string): Cue[] => {
  const cues = raw
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .flatMap((block) => {
      const lines = block.split(/\r?\n/).map((l) => l.trim());
      const idx = lines.findIndex((l) => l.includes("-->"));
      if (idx < 0) return [];
      const m = lines[idx].match(
        /(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/,
      );
      if (!m) return [];
      const sec = (h: string, mi: string, s: string, ms: string) =>
        Number(h) * 3600 + Number(mi) * 60 + Number(s) + Number(ms) / 1000;
      return [
        {
          start: sec(m[1], m[2], m[3], m[4]),
          end: sec(m[5], m[6], m[7], m[8]),
          // ElevenLabs SRT-এর বানান ঠিক করা: অতিভরাজ → অতিভুজ
          text: lines
            .slice(idx + 1)
            .join(" ")
            .replace(/অতিভরাজ/g, "অতিভুজ"),
        },
      ];
    });

  // ছোট বিরতি থাকলে সাবটাইটেল পরের লাইন পর্যন্ত ধরে রাখি (ঝিলিক এড়াতে)
  return cues.map((c, i) => {
    const next = cues[i + 1];
    const end = next && next.start - c.end < 1 ? next.start : c.end + 0.2;
    return { ...c, end };
  });
};

const CUES = parseCues(SRT);

/* ────────────────────────────────────────────────────────────
   3. ছোট হেল্পার কম্পোনেন্ট
   ──────────────────────────────────────────────────────────── */

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

// at সেকেন্ডে ভেসে ওঠে, until সেকেন্ডে মিলিয়ে যায়, চাইলে moveAt-এ top থেকে moveTo-তে সরে
const Reveal: React.FC<{
  at: number;
  until?: number;
  top?: number;
  moveAt?: number;
  moveTo?: number;
  style?: CSSProperties;
  children: ReactNode;
}> = ({ at, until, top, moveAt, moveTo, style, children }) => {
  const t = useT();
  const inP = interpolate(t, [at, at + 0.7], [0, 1], { ...CLAMP, easing: EASE });
  const outP =
    until === undefined
      ? 1
      : interpolate(t, [until, until + 0.5], [1, 0], CLAMP);
  const y =
    top !== undefined && moveAt !== undefined && moveTo !== undefined
      ? interpolate(t, [moveAt, moveAt + 0.9], [top, moveTo], {
          ...CLAMP,
          easing: EASE,
        })
      : top;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        opacity: Math.min(inP, outP),
        translate: `0px ${(1 - inP) * 28}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// লাইনের ভেতরের অংশ আলাদা সময়ে দেখানোর জন্য
const Fade: React.FC<{ at: number; children: ReactNode }> = ({ at, children }) => {
  const t = useT();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        opacity: interpolate(t, [at, at + 0.6], [0, 1], CLAMP),
      }}
    >
      {children}
    </span>
  );
};

const Sq: React.FC = () => (
  <span
    style={{
      fontSize: "0.55em",
      position: "relative",
      top: "-0.7em",
      marginLeft: 3,
      marginRight: 2,
    }}
  >
    2
  </span>
);

const Theta: React.FC = () => <span style={{ color: C.T }}>θ</span>;

const Trig: React.FC<{ name: string; sq?: boolean }> = ({ name, sq }) => (
  <span>
    {name}
    {sq ? <Sq /> : null}
    <Theta />
  </span>
);
const Sin: React.FC<{ sq?: boolean }> = ({ sq }) => <Trig name="sin" sq={sq} />;
const Cos: React.FC<{ sq?: boolean }> = ({ sq }) => <Trig name="cos" sq={sq} />;

const term =
  (label: string, color: string): React.FC<{ sq?: boolean }> =>
  ({ sq }) => (
    <span style={{ color, fontFamily: UI, fontWeight: 700 }}>
      {label}
      {sq ? <Sq /> : null}
    </span>
  );
const Lm = term("লম্ব", C.L);
const Bh = term("ভূমি", C.B);
const Hy = term("অতিভুজ", C.H);

const Op: React.FC<{ c: string }> = ({ c }) => (
  <span style={{ margin: "0 18px" }}>{c}</span>
);

const Frac: React.FC<{ n: ReactNode; d: ReactNode }> = ({ n, d }) => (
  <span
    style={{
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      margin: "0 8px",
    }}
  >
    <span style={{ padding: "0 12px 8px", lineHeight: 1.15 }}>{n}</span>
    <span
      style={{
        alignSelf: "stretch",
        height: 5,
        borderRadius: 3,
        background: "#e9ecef",
      }}
    />
    <span style={{ padding: "8px 12px 0", lineHeight: 1.15 }}>{d}</span>
  </span>
);

const Eq: React.FC<{ center?: boolean; children: ReactNode }> = ({
  center,
  children,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: center ? "center" : "flex-start",
      fontSize: ROW,
      color: C.text,
      whiteSpace: "nowrap",
      lineHeight: 1.2,
    }}
  >
    {children}
  </div>
);

const Chip: React.FC<{ children: ReactNode; color?: string }> = ({
  children,
  color = C.dim,
}) => (
  <div
    style={{
      fontFamily: UI,
      fontSize: 56,
      fontWeight: 700,
      color,
      textAlign: "center",
      lineHeight: 1.35,
    }}
  >
    {children}
  </div>
);

const PythagCard: React.FC = () => (
  <div
    style={{
      border: `3px dashed ${C.H}`,
      borderRadius: 28,
      padding: "18px 24px",
      textAlign: "center",
      background: "rgba(255,212,59,0.07)",
    }}
  >
    <div
      style={{
        fontFamily: UI,
        fontSize: 56,
        fontWeight: 700,
        color: C.H,
        marginBottom: 6,
        lineHeight: 1.4,
      }}
    >
      পিথাগোরাসের উপপাদ্য
    </div>
    <Eq center>
      <Lm sq />
      <Op c="+" />
      <Bh sq />
      <Op c="=" />
      <Hy sq />
    </Eq>
  </div>
);

/* ────────────────────────────────────────────────────────────
   4. ব্যাকগ্রাউন্ড, প্রগ্রেস বার, সাবটাইটেল
   ──────────────────────────────────────────────────────────── */

const Background: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(1200px 700px at 12% 8%, rgba(60,90,200,0.28), transparent 70%)," +
        "radial-gradient(1000px 700px at 92% 95%, rgba(130,60,190,0.25), transparent 70%)," +
        "#0b1020",
    }}
  >
    <AbsoluteFill
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)," +
          "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }}
    />
  </AbsoluteFill>
);

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        height: 8,
        width: `${(frame / durationInFrames) * 100}%`,
        background: C.H,
      }}
    />
  );
};

const Subtitles: React.FC = () => {
  const t = useT();
  const cue = CUES.find((c) => t >= c.start && t < c.end);
  if (!cue) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 160,
        right: 160,
        bottom: 56,
        display: "flex",
        justifyContent: "center",
        opacity: interpolate(t, [cue.start, cue.start + 0.12], [0, 1], CLAMP),
      }}
    >
      <div
        style={{
          fontFamily: UI,
          fontSize: 50,
          lineHeight: 1.45,
          color: "#fff",
          textAlign: "center",
          padding: "16px 40px",
          borderRadius: 26,
          background: "rgba(8,12,26,0.80)",
          border: "2px solid rgba(255,255,255,0.12)",
        }}
      >
        {cue.text}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   5. দৃশ্য ১: হুক (০ – ১৪ সেকেন্ড)
   ──────────────────────────────────────────────────────────── */

const Hook: React.FC = () => {
  const big: CSSProperties = {
    textAlign: "center",
    fontFamily: MATH,
    fontWeight: 700,
    color: "#fff",
  };
  return (
    <>
      <Reveal at={0.2} until={14.2} top={110} style={{ ...big, fontSize: 176 }}>
        <Sin sq />
        <Op c="+" />
        <Cos sq />
      </Reveal>
      <Reveal at={1.2} until={4.6} top={350} style={{ ...big, fontSize: 190, color: C.dim }}>
        = ?
      </Reveal>
      <Reveal at={4.8} until={14.2} top={350} style={{ ...big, fontSize: 190, color: C.H }}>
        = 1
      </Reveal>
      <Reveal
        at={6.8}
        until={14.2}
        top={610}
        style={{ ...big, fontFamily: UI, fontSize: 110, color: "#ff8fab" }}
      >
        কেন?
      </Reveal>
    </>
  );
};

/* ────────────────────────────────────────────────────────────
   6. ত্রিভুজ (১৪ সেকেন্ড থেকে শেষ পর্যন্ত বাঁ পাশে)
   ──────────────────────────────────────────────────────────── */

const Triangle: React.FC = () => {
  const t = useT();
  const draw = (at: number, len: number) =>
    interpolate(t, [at, at + 1.1], [len, 0], {
      ...CLAMP,
      easing: Easing.bezier(0.45, 0, 0.2, 1),
    });
  const show = (at: number) => interpolate(t, [at, at + 0.5], [0, 1], CLAMP);

  return (
    <svg
      width={840}
      height={685}
      viewBox="0 0 760 620"
      style={{ position: "absolute", left: 80, top: 120, fontFamily: UI }}
    >
      {/* ভূমি (নীল) */}
      <line
        x1={40} y1={540} x2={620} y2={540}
        stroke={C.B} strokeWidth={9} strokeLinecap="round"
        strokeDasharray={580} strokeDashoffset={draw(17.0, 580)}
        opacity={t >= 17.0 ? 1 : 0}
      />
      {/* লম্ব (লাল) */}
      <line
        x1={620} y1={540} x2={620} y2={130}
        stroke={C.L} strokeWidth={9} strokeLinecap="round"
        strokeDasharray={410} strokeDashoffset={draw(18.2, 410)}
        opacity={t >= 18.2 ? 1 : 0}
      />
      {/* অতিভুজ (হলুদ) */}
      <line
        x1={40} y1={540} x2={620} y2={130}
        stroke={C.H} strokeWidth={9} strokeLinecap="round"
        strokeDasharray={710} strokeDashoffset={draw(19.4, 710)}
        opacity={t >= 19.4 ? 1 : 0}
      />
      {/* সমকোণ চিহ্ন */}
      <path
        d="M 580 540 L 580 500 L 620 500"
        fill="none" stroke="#fff" strokeWidth={4}
        opacity={show(20.2)}
      />
      {/* θ কোণ */}
      <path
        d="M 120 540 A 80 80 0 0 0 105.3 493.8"
        fill="none" stroke={C.T} strokeWidth={6} strokeLinecap="round"
        opacity={show(21.0)}
      />
      <text
        x={152} y={514}
        fill={C.T} fontSize={50} fontWeight={700}
        dominantBaseline="middle"
        style={{ fontFamily: MATH }}
        opacity={show(21.3)}
      >
        θ
      </text>
      {/* বাহুর নাম */}
      <text
        x={645} y={345}
        fill={C.L} fontSize={46} fontWeight={700} dominantBaseline="middle"
        opacity={show(23.2)}
      >
        লম্ব
      </text>
      <text
        x={330} y={604}
        fill={C.B} fontSize={46} fontWeight={700} textAnchor="middle"
        opacity={show(24.3)}
      >
        ভূমি
      </text>
      <text
        x={285} y={272}
        fill={C.H} fontSize={46} fontWeight={700} textAnchor="middle"
        opacity={show(25.2)}
      >
        অতিভুজ
      </text>
    </svg>
  );
};

/* ────────────────────────────────────────────────────────────
   7. ডান পাশের ধাপে ধাপে প্রমাণ (২৮ – ১০৫ সেকেন্ড)
   ──────────────────────────────────────────────────────────── */

const Steps: React.FC = () => (
  <div style={{ position: "absolute", left: 1000, top: 90, width: 820, height: 720 }}>
    {/* ধাপ ১: sinθ ও cosθ */}
    <Reveal at={28.3} until={35.2} top={40}>
      <Eq>
        <Sin />
        <Op c="=" />
        <Frac n={<Lm />} d={<Hy />} />
      </Eq>
    </Reveal>
    <Reveal at={31.3} until={35.2} top={270}>
      <Eq>
        <Cos />
        <Op c="=" />
        <Frac n={<Bh />} d={<Hy />} />
      </Eq>
    </Reveal>

    {/* ধাপ ২: বর্গ করা */}
    <Reveal at={35.4} until={38.8} top={250}>
      <Chip>দুটোরই বর্গ করি</Chip>
    </Reveal>
    <Reveal at={39.0} until={49.2} top={40}>
      <Eq>
        <Sin sq />
        <Op c="=" />
        <Frac n={<Lm sq />} d={<Hy sq />} />
      </Eq>
    </Reveal>
    <Reveal at={44.0} until={49.2} top={270}>
      <Eq>
        <Cos sq />
        <Op c="=" />
        <Frac n={<Bh sq />} d={<Hy sq />} />
      </Eq>
    </Reveal>

    {/* ধাপ ৩: যোগ করা */}
    <Reveal at={49.8} until={85.2} top={0}>
      <Eq>
        <Sin sq />
        <Op c="+" />
        <Cos sq />
      </Eq>
    </Reveal>
    <Reveal at={51.2} until={56.6} top={110}>
      <Eq>
        <Op c="=" />
        <Frac n={<Lm sq />} d={<Hy sq />} />
        <Op c="+" />
        <Frac n={<Bh sq />} d={<Hy sq />} />
      </Eq>
    </Reveal>
    <Reveal at={53.4} until={85.2} top={290} moveAt={57.0} moveTo={110}>
      <Eq>
        <Op c="=" />
        <Frac
          n={
            <>
              <Lm sq />
              <Op c="+" />
              <Bh sq />
            </>
          }
          d={<Hy sq />}
        />
      </Eq>
    </Reveal>

    {/* ধাপ ৪: পিথাগোরাস */}
    <Reveal at={60.0} until={85.2} top={300}>
      <PythagCard />
    </Reveal>

    {/* ধাপ ৫: লবে বসানো, ভাগফল ১ */}
    <Reveal at={71.5} until={85.2} top={530}>
      <Eq>
        <Op c="=" />
        <Frac n={<Hy sq />} d={<Hy sq />} />
        <Fade at={82.0}>
          <Op c="=" />
          <span style={{ color: C.H, fontWeight: 700 }}>1</span>
        </Fade>
      </Eq>
    </Reveal>

    {/* ফলাফল */}
    <Reveal at={85.8} top={0}>
      <div
        style={{
          border: `4px solid ${C.H}`,
          borderRadius: 28,
          padding: "14px 20px",
          background: "rgba(255,212,59,0.09)",
          boxShadow: "0 0 60px rgba(255,212,59,0.25)",
        }}
      >
        <Eq center>
          <Sin sq />
          <Op c="+" />
          <Cos sq />
          <Op c="=" />
          <span style={{ color: C.H, fontWeight: 700 }}>1</span>
        </Eq>
      </div>
    </Reveal>

    {/* উপসংহার */}
    <Reveal at={91.2} until={94.4} top={200}>
      <Chip color="#ff8787">শুধু মুখস্থ করার জন্য নয়</Chip>
    </Reveal>
    <Reveal at={94.6} top={180}>
      <PythagCard />
    </Reveal>
    <Reveal at={98.2} top={410}>
      <Chip>জ্যামিতির সহজ যুক্তি</Chip>
    </Reveal>
    <Reveal at={104.8} top={505}>
      <div
        style={{
          fontFamily: UI,
          fontSize: 66,
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.35,
          color: "#fff",
        }}
      >
        গণিতকে মুখস্থ নয়,{" "}
        <span style={{ color: C.H }}>বুঝে শেখো।</span>
      </div>
    </Reveal>
  </div>
);

/* ────────────────────────────────────────────────────────────
   8. মূল কম্পোজিশন ও রুট
   ──────────────────────────────────────────────────────────── */

type MainProps = { hasAudio: boolean };

const Main: React.FC<MainProps> = ({ hasAudio }) => (
  <AbsoluteFill style={{ backgroundColor: "#0b1020", fontFamily: MATH }}>
    <Background />
    {hasAudio ? <Audio src={staticFile("voiceover.mp3")} /> : null}
    <Hook />
    <Triangle />
    <Steps />
    <Subtitles />
    <ProgressBar />
  </AbsoluteFill>
);

const Root: React.FC = () => (
  <Composition
    id="SinCosIdentity"
    component={Main}
    durationInFrames={Math.round(DURATION_SEC * FPS)}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={{ hasAudio: false }}
  />
);

registerRoot(Root);
