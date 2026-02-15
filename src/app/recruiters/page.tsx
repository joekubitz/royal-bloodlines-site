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
          marginBottom: "40px",
          opacity: 0.7,
        }}
      >
        These are the leaders helping creators join and succeed in Royals Bloodline.
      </p>

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
    </main>
  );
}
