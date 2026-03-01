export default function RecruitersPage() {
  
  const recruiters = [
    {
      name: "ExoticBlaze",
      username: "@exoticblaze",
      title: "Royals Bloodline Recruiter",
      bio: "Dedicated to helping creators grow, build their brand, and succeed inside Royals Bloodline.",
      image: "/recruiters/exoticblaze.png",
    },
    {
      name: "Chelsea G",
      username: "@chelseag",
      title: "Royals Bloodline Recruiter",
      bio: "Focused on guiding new creators and helping them unlock their full potential.",
      image: "/recruiters/chelsea.png",
    },
    {
      name: "Kaitlin",
      username: "@kaitlin",
      title: "Royals Bloodline Recruiter",
      bio: "Passionate about building strong creators and supporting their growth journey.",
      image: "/recruiters/kaitlin.png",
    },
    {
      name: "Kennywright_01",
      username: "@kennywright_01",
      title: "Royals Bloodline Recruiter",
      bio: "Helping creators join the Bloodline and scale their presence with real support.",
      image: "/recruiters/kenny.png",
    },
    {
      name: "Halfrican Knight",
      username: "@halfricanknight",
      title: "Royals Bloodline Recruiter",
      bio: "Committed to helping creators grow faster and become successful live creators.",
      image: "/recruiters/halfrican.png",
    },
  ];

  return (
    <main
      style={{
        padding: "60px 20px",
        maxWidth: "1100px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontSize: "42px",
          fontWeight: "bold",
          marginBottom: "10px",
          textAlign: "center",
        }}
      >
        Meet Our Recruiters
      </h1>

      <p
        style={{
          textAlign: "center",
          marginBottom: "28px",
          opacity: 0.7,
        }}
      >
        These are the leaders helping creators join and succeed in Royals Bloodline.
      </p>

      {/* Recruiters Banner */}
      <div
        style={{
          position: "relative",
          borderRadius: "16px",
          overflow: "hidden",
          margin: "0 auto 40px",
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.35)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        }}
      >
        <img
          src="/recruiters/recruiters.png"
          alt="Royals Bloodline Recruiters"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            objectFit: "cover",
          }}
        />

        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "30px",
        }}
      >
        {recruiters.map((recruiter) => (
          <div
            key={recruiter.name}
            style={{
              background: "#111",
              borderRadius: "12px",
              padding: "25px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <img
              src={recruiter.image}
              alt={recruiter.name}
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                objectFit: "cover",
                marginBottom: "15px",
              }}
            />

            <h2 style={{ marginBottom: "5px" }}>{recruiter.name}</h2>

            <p style={{ opacity: 0.5, fontSize: "14px" }}>
              {recruiter.title}
            </p>

            <p
              style={{
                marginTop: "12px",
                fontSize: "14px",
                opacity: 0.8,
                lineHeight: "1.4",
              }}
            >
              {recruiter.bio}
            </p>
          </div>
        ))}
      </div>

      {/* 🔥 Join CTA Button */}
      <div
        style={{
          textAlign: "center",
          marginTop: "50px",
          marginBottom: "20px",
        }}
      >
        <a
          href="https://www.tiktok.com/t/ZThPkCPs4/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "linear-gradient(90deg, #D4AF37, #FFD700)",
            color: "#000",
            padding: "14px 28px",
            borderRadius: "12px",
            fontWeight: 700,
            fontSize: "16px",
            textDecoration: "none",
            letterSpacing: "0.5px",
            transition: "all 0.2s ease",
          }}
        >
          ⚜️ Join Royal Bloodlines
        </a>
      </div>
    </main>
  );
}