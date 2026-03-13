export default function DashboardLoading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        width: "100%",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: "3px solid #E8E6E1",
          borderTopColor: "#0B5394",
          borderRadius: "50%",
          animation: "dashSpin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes dashSpin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
