using UnityEngine;

namespace AgentsExample
{
    public abstract class AuthConfig : ScriptableObject
    {
        public abstract bool IsValid { get; }
    }
}