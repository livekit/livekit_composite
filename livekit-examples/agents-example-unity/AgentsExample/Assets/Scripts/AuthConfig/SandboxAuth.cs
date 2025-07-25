using UnityEngine;

namespace AgentsExample
{
    [CreateAssetMenu(fileName = "TokenService", menuName = "LiveKit/Sandbox Auth")]
    public class SandboxAuth : AuthConfig
    {
        [SerializeField] private string _sandboxId;

        public string SandboxId => _sandboxId?.Trim('"');

        public override bool IsValid =>
            !string.IsNullOrEmpty(SandboxId);
    }
}