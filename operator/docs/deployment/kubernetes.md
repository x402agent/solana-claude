# Kubernetes Deployment Guide

Deploy Ralph Orchestrator on Kubernetes for scalable, resilient AI orchestration.

## Prerequisites

- Kubernetes cluster 1.20+ (local or cloud)
- `kubectl` configured with cluster access
- Helm 3.0+ (optional, for Helm deployment)
- Container registry access (Docker Hub, GCR, ECR, etc.)
- Minimum 2 nodes with 4GB RAM each

## Quick Start

### Basic Deployment with kubectl

Create namespace and deploy:

```bash
# Create namespace
kubectl create namespace ralph-orchestrator

# Apply manifests
kubectl apply -f k8s/ -n ralph-orchestrator

# Check deployment
kubectl get pods -n ralph-orchestrator
```

## Kubernetes Manifests

### 1. Namespace and ConfigMap

```yaml
# k8s/00-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ralph-orchestrator
---
# k8s/01-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ralph-config
  namespace: ralph-orchestrator
data:
  RALPH_AGENT: "auto"
  RALPH_MAX_ITERATIONS: "100"
  RALPH_MAX_RUNTIME: "14400"
  RALPH_CHECKPOINT_INTERVAL: "5"
  RALPH_VERBOSE: "true"
  RALPH_ENABLE_METRICS: "true"
```

### 2. Secrets Management

```yaml
# k8s/02-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ralph-secrets
  namespace: ralph-orchestrator
type: Opaque
stringData:
  CLAUDE_API_KEY: "sk-ant-..."
  GEMINI_API_KEY: "AIza..."
  Q_API_KEY: "..."
```

Apply secrets from command line:

```bash
# Create secret from literals
kubectl create secret generic ralph-secrets \
  --from-literal=CLAUDE_API_KEY=$CLAUDE_API_KEY \
  --from-literal=GEMINI_API_KEY=$GEMINI_API_KEY \
  --from-literal=Q_API_KEY=$Q_API_KEY \
  -n ralph-orchestrator
```

### 3. Persistent Storage

```yaml
# k8s/03-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ralph-workspace
  namespace: ralph-orchestrator
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ralph-cache
  namespace: ralph-orchestrator
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: standard
  resources:
    requests:
      storage: 5Gi
```

### 4. Deployment

```yaml
# k8s/04-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ralph-orchestrator
  namespace: ralph-orchestrator
  labels:
    app: ralph-orchestrator
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ralph-orchestrator
  template:
    metadata:
      labels:
        app: ralph-orchestrator
    spec:
      serviceAccountName: ralph-sa
      containers:
      - name: ralph
        image: ghcr.io/mikeyobrien/ralph-orchestrator:v1.0.0
        imagePullPolicy: Always
        envFrom:
        - configMapRef:
            name: ralph-config
        - secretRef:
            name: ralph-secrets
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        - name: cache
          mountPath: /app/.cache
        - name: prompts
          mountPath: /prompts
        livenessProbe:
          exec:
            command:
            - python
            - -c
            - "import sys; sys.exit(0)"
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          exec:
            command:
            - python
            - -c
            - "import os; sys.exit(0 if os.path.exists('/app/ralph_orchestrator.py') else 1)"
          initialDelaySeconds: 10
          periodSeconds: 10
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: ralph-workspace
      - name: cache
        persistentVolumeClaim:
          claimName: ralph-cache
      - name: prompts
        configMap:
          name: ralph-prompts
```

### 5. Service and Monitoring

```yaml
# k8s/05-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: ralph-metrics
  namespace: ralph-orchestrator
  labels:
    app: ralph-orchestrator
spec:
  type: ClusterIP
  ports:
  - port: 8080
    targetPort: 8080
    name: metrics
  selector:
    app: ralph-orchestrator
---
# k8s/06-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ralph-orchestrator
  namespace: ralph-orchestrator
spec:
  selector:
    matchLabels:
      app: ralph-orchestrator
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

### 6. Job for One-Time Tasks

```yaml
# k8s/07-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ralph-task
  namespace: ralph-orchestrator
spec:
  backoffLimit: 3
  activeDeadlineSeconds: 14400
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: ralph
        image: ghcr.io/mikeyobrien/ralph-orchestrator:v1.0.0
        envFrom:
        - configMapRef:
            name: ralph-config
        - secretRef:
            name: ralph-secrets
        args:
        - "--agent=claude"
        - "--prompt=/prompts/task.md"
        - "--max-iterations=50"
        volumeMounts:
        - name: prompts
          mountPath: /prompts
        - name: output
          mountPath: /output
      volumes:
      - name: prompts
        configMap:
          name: ralph-prompts
      - name: output
        emptyDir: {}
```

## Helm Chart Deployment

### Install with Helm

```bash
# Add repository
helm repo add ralph https://mikeyobrien.github.io/ralph-orchestrator/charts
helm repo update

# Install with custom values
helm install ralph ralph/ralph-orchestrator \
  --namespace ralph-orchestrator \
  --create-namespace \
  --set apiKeys.claude=$CLAUDE_API_KEY \
  --set apiKeys.gemini=$GEMINI_API_KEY \
  --set config.maxIterations=100
```

### Custom values.yaml

```yaml
# values.yaml
replicaCount: 1

image:
  repository: ghcr.io/mikeyobrien/ralph-orchestrator
  tag: v1.0.0
  pullPolicy: IfNotPresent

apiKeys:
  claude: ""
  gemini: ""
  q: ""

config:
  agent: "auto"
  maxIterations: 100
  maxRuntime: 14400
  checkpointInterval: 5
  verbose: true
  enableMetrics: true

resources:
  requests:
    memory: "2Gi"
    cpu: "1"
  limits:
    memory: "4Gi"
    cpu: "2"

persistence:
  enabled: true
  storageClass: "standard"
  workspace:
    size: 10Gi
  cache:
    size: 5Gi

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s

ingress:
  enabled: false
  className: "nginx"
  annotations: {}
  hosts:
    - host: ralph.example.com
      paths:
        - path: /
          pathType: Prefix
```

## Horizontal Pod Autoscaling

```yaml
# k8s/08-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ralph-hpa
  namespace: ralph-orchestrator
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ralph-orchestrator
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## CronJob for Scheduled Tasks

```yaml
# k8s/09-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ralph-daily
  namespace: ralph-orchestrator
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: ralph
            image: ghcr.io/mikeyobrien/ralph-orchestrator:v1.0.0
            envFrom:
            - configMapRef:
                name: ralph-config
            - secretRef:
                name: ralph-secrets
            args:
            - "--agent=auto"
            - "--prompt=/prompts/daily-task.md"
```

## Service Account and RBAC

```yaml
# k8s/10-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ralph-sa
  namespace: ralph-orchestrator
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ralph-role
  namespace: ralph-orchestrator
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ralph-rolebinding
  namespace: ralph-orchestrator
roleRef:
  apiVersion: rbac.authorization.k8s.io/v1
  kind: Role
  name: ralph-role
subjects:
- kind: ServiceAccount
  name: ralph-sa
  namespace: ralph-orchestrator
```

## Network Policies

```yaml
# k8s/11-networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ralph-network-policy
  namespace: ralph-orchestrator
spec:
  podSelector:
    matchLabels:
      app: ralph-orchestrator
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443  # HTTPS for API calls
    - protocol: TCP
      port: 53   # DNS
    - protocol: UDP
      port: 53   # DNS
```

## Monitoring with Prometheus

```yaml
# k8s/12-prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'ralph-orchestrator'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - ralph-orchestrator
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: ralph-orchestrator
```

## Cloud Provider Specific

### Google Kubernetes Engine (GKE)

```bash
# Create cluster
gcloud container clusters create ralph-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-2

# Get credentials
gcloud container clusters get-credentials ralph-cluster \
  --zone us-central1-a

# Create secret for GCR
kubectl create secret docker-registry gcr-json-key \
  --docker-server=gcr.io \
  --docker-username=_json_key \
  --docker-password="$(cat ~/key.json)" \
  -n ralph-orchestrator
```

### Amazon EKS

```bash
# Create cluster
eksctl create cluster \
  --name ralph-cluster \
  --region us-west-2 \
  --nodegroup-name workers \
  --node-type t3.medium \
  --nodes 3

# Update kubeconfig
aws eks update-kubeconfig \
  --name ralph-cluster \
  --region us-west-2
```

### Azure AKS

```bash
# Create cluster
az aks create \
  --resource-group ralph-rg \
  --name ralph-cluster \
  --node-count 3 \
  --node-vm-size Standard_DS2_v2

# Get credentials
az aks get-credentials \
  --resource-group ralph-rg \
  --name ralph-cluster
```

## GitOps with ArgoCD

```yaml
# k8s/argocd-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ralph-orchestrator
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/mikeyobrien/ralph-orchestrator
    targetRevision: HEAD
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: ralph-orchestrator
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Troubleshooting

### Check Pod Status

```bash
# Get pods
kubectl get pods -n ralph-orchestrator

# Describe pod
kubectl describe pod <pod-name> -n ralph-orchestrator

# View logs
kubectl logs -f <pod-name> -n ralph-orchestrator

# Execute into pod
kubectl exec -it <pod-name> -n ralph-orchestrator -- /bin/bash
```

### Common Issues

#### ImagePullBackOff

```bash
# Check image pull secrets
kubectl get secrets -n ralph-orchestrator

# Create pull secret
kubectl create secret docker-registry regcred \
  --docker-server=ghcr.io \
  --docker-username=USERNAME \
  --docker-password=TOKEN \
  -n ralph-orchestrator
```

#### PVC Not Bound

```bash
# Check PVC status
kubectl get pvc -n ralph-orchestrator

# Check available storage classes
kubectl get storageclass

# Create PV if needed
kubectl apply -f persistent-volume.yaml
```

#### OOMKilled

```bash
# Increase memory limits
kubectl set resources deployment ralph-orchestrator \
  --limits=memory=8Gi \
  -n ralph-orchestrator
```

## Best Practices

1. **Use namespaces** to isolate Ralph deployments
2. **Implement RBAC** for least privilege access
3. **Use secrets management** (Sealed Secrets, External Secrets)
4. **Set resource limits** to prevent resource starvation
5. **Enable monitoring** with Prometheus/Grafana
6. **Use network policies** for security
7. **Implement health checks** for automatic recovery
8. **Use GitOps** for declarative deployments
9. **Regular backups** of persistent volumes
10. **Use pod disruption budgets** for high availability

## Production Considerations

- **High Availability**: Deploy across multiple availability zones
- **Disaster Recovery**: Regular backups and cross-region replication
- **Security**: Pod Security Policies, Network Policies, RBAC
- **Observability**: Logging (ELK), Metrics (Prometheus), Tracing (Jaeger)
- **Cost Optimization**: Use spot instances, autoscaling, resource quotas
- **Compliance**: Audit logging, encryption at rest and in transit

## Next Steps

- [CI/CD Integration](ci-cd.md) - Automate Kubernetes deployments
- [Production Guide](production.md) - Production best practices
- [Monitoring Setup](../advanced/monitoring.md) - Complete observability