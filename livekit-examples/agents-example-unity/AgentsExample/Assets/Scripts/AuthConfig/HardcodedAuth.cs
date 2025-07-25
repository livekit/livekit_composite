using UnityEngine;

namespace AgentsExample
{
    [CreateAssetMenu(fileName = "TokenService", menuName = "LiveKit/Hardcoded Auth")]
    public class HardcodedAuth : AuthConfig
    {
        [SerializeField] private string _serverUrl;
        [SerializeField] private string _token;

        public string ServerUrl => _serverUrl;
        public string Token => _token;

        public override bool IsValid =>
            !string.IsNullOrEmpty(ServerUrl) && ServerUrl.StartsWith("ws") &&
            !string.IsNullOrEmpty(Token);
    }
}